require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const rustdeskRoutes = require("./routes/rustdesk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rustdesk", rustdeskRoutes);

// Database initialization
const db = require("./db");
const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Cria um admin padrão se não existir
    const result = await db.query("SELECT * FROM users WHERE email = 'admin@test.com'");
    if (result.rows.length === 0) {
      await db.query("INSERT INTO users (email, password) VALUES ('admin@test.com', '123')");
      console.log("Default admin user created");
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
    console.log("Devices table ensured");
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
