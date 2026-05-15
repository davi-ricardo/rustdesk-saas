require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const rustdeskRoutes = require("./routes/rustdesk");
const userRoutes = require("./routes/users");
const groupRoutes = require("./routes/groups");
const serviceCategoriesRoutes = require("./routes/serviceCategories");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração detalhada do CORS
app.use(cors({
  origin: "*", // Em produção você pode restringir ao IP/Domínio do seu frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ["text/*", "application/octet-stream"] }));

// Middleware de logging DEPOIS de processar o body!
if (process.env.LOG_REQUESTS === "1") {
  app.use((req, res, next) => {
    const ct = req.headers["content-type"] || "";
    const cl = req.headers["content-length"] || "";
    console.log(`[REQ] ${req.method} ${req.path} ct=${ct} len=${cl}`);
    
    // Para requisições POST, loga o corpo da requisição DEPOIS que foi processado!
    if (req.method === "POST") {
      // Se o body existe, loga ele AGORA!
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[REQ-BODY] ${req.method} ${req.path} body=${JSON.stringify(req.body)}`);
      } else if (typeof req.body === 'string' && req.body.length > 0) {
        console.log(`[REQ-BODY] ${req.method} ${req.path} body=${req.body}`);
      }
    }
    
    next();
  });
}

// Routes (ordem importante: rotas específicas antes da rota coringa do RustDesk!)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/service-categories", serviceCategoriesRoutes);
app.use("/api", rustdeskRoutes);

// Database initialization
const db = require("./db");
const initDb = async () => {
  try {
    // Cria ou atualiza a tabela de usuários com a coluna role e username
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração: Adiciona colunas se não existirem
    try {
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'");
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE");
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true");
    } catch (e) {}
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS hbbr_sessions (
        request_id VARCHAR(64) PRIMARY KEY,
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        paired_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        a_ip VARCHAR(45),
        a_port INTEGER,
        b_ip VARCHAR(45),
        b_port INTEGER,
        a_closed_at TIMESTAMPTZ,
        b_closed_at TIMESTAMPTZ,
        last_line TEXT
      );
    `);

    // Cria ou atualiza o administrador baseado nas variáveis de ambiente
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '123';
    
    // Forçar a criação/atualização do administrador sem depender de busca por email
    // Isso garante que se você mudar o email no docker-compose, o sistema se ajuste
    await db.query(`
      INSERT INTO users (username, email, password, role) 
      VALUES ('administrador', $1, $2, 'admin')
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        role = 'admin'
    `, [adminEmail, adminPassword]);
    
    console.log(`Admin user 'administrador' synchronized (${adminEmail})`);

    // Cria tabela de dispositivos (devices)
    await db.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(50) UNIQUE NOT NULL,
        uuid VARCHAR(100),
        username VARCHAR(100),
        hostname VARCHAR(100),
        ip_address VARCHAR(45),
        os VARCHAR(50),
        last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cria tabela de Livro de Endereços (address_book)
    await db.query(`
      CREATE TABLE IF NOT EXISTS address_book (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(50) UNIQUE NOT NULL,
        alias VARCHAR(100),
        tags VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      );
    `);

    // Cria tabela de Grupos (groups)
    await db.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adiciona group_id no address_book se não existir
    try {
      await db.query("ALTER TABLE address_book ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL");
    } catch (e) {}

    // Cria tabela de Categorias de Serviços
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cria tabela de Relatórios de Conexão (connection_logs)
    await db.query(`
      CREATE TABLE IF NOT EXISTS connection_logs (
        id SERIAL PRIMARY KEY,
        from_device_id VARCHAR(50),
        to_device_id VARCHAR(50),
        action VARCHAR(20), -- 'start', 'end'
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER, -- em segundos, opcional para o evento 'end'
        category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL
      );
    `);

    // Migração: Adiciona category_id no connection_logs se não existir
    try {
      await db.query("ALTER TABLE connection_logs ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL");
    } catch (e) {}

    // Migração: Adiciona conn_id e session_id no connection_logs se não existirem
    try {
      await db.query("ALTER TABLE connection_logs ADD COLUMN IF NOT EXISTS conn_id TEXT");
      await db.query("ALTER TABLE connection_logs ADD COLUMN IF NOT EXISTS session_id TEXT");
      // Cria índices para melhorar a performance
      await db.query("CREATE INDEX IF NOT EXISTS idx_connection_logs_conn_id ON connection_logs (conn_id)");
      await db.query("CREATE INDEX IF NOT EXISTS idx_connection_logs_session_id ON connection_logs (session_id)");
    } catch (e) {
      console.log("Migração conn_id/session_id já aplicada ou erro:", e.message);
    }

    console.log("Database tables ensured");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};
initDb();

app.get("/", (req, res) => {
  res.json({ message: "RustDesk SaaS API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
