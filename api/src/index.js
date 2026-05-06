require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const rustdeskRoutes = require("./routes/rustdesk");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rustdesk", rustdeskRoutes);
app.use("/api/users", userRoutes);

// Database initialization
const db = require("./db");
const initDb = async () => {
  try {
    // Cria ou atualiza a tabela de usuários com a coluna role
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tenta adicionar a coluna role se ela não existir (para migração de quem já tem o banco)
    try {
      await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'");
    } catch (e) {}
    
    // Cria ou atualiza o administrador baseado nas variáveis de ambiente
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '123';
    
    const result = await db.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
    if (result.rows.length === 0) {
      await db.query("INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin')", [adminEmail, adminPassword]);
      console.log(`Default admin user created: ${adminEmail}`);
    } else {
      await db.query("UPDATE users SET password = $1, role = 'admin' WHERE email = $2", [adminPassword, adminEmail]);
      console.log(`Admin credentials updated for: ${adminEmail}`);
    }

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
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cria tabela de Livro de Endereços (address_book)
    await db.query(`
      CREATE TABLE IF NOT EXISTS address_book (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(50) UNIQUE NOT NULL,
        alias VARCHAR(100),
        tags VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      );
    `);

    // Cria tabela de Relatórios de Conexão (connection_logs)
    await db.query(`
      CREATE TABLE IF NOT EXISTS connection_logs (
        id SERIAL PRIMARY KEY,
        from_device_id VARCHAR(50),
        to_device_id VARCHAR(50),
        action VARCHAR(20), -- 'start', 'end'
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER -- em segundos, opcional para o evento 'end'
      );
    `);
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
