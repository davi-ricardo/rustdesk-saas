const fs = require('fs');
const db = require("../db");

exports.getServerInfo = (req, res) => {
  try {
    const publicKeyPath = '/root/id_ed25519.pub';
    let publicKey = process.env.RUSTDESK_KEY || 'Key not found';

    if (fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
    }

    res.json({
      idServer: process.env.ID_SERVER || '76.13.174.204',
      relayServer: process.env.RELAY_SERVER || '76.13.174.204',
      key: publicKey
    });
  } catch (err) {
    console.error('Error reading RustDesk key:', err);
    res.status(500).json({ error: 'Failed to get server info' });
  }
};

exports.clientLogin = (req, res) => {
  const { username } = req.body;
  res.json({
    access_token: "fake-client-token",
    user: { name: username || "User" }
  });
};

exports.heartbeat = async (req, res) => {
  // Log para depuração na VPS (docker logs rustdesk-saas-api-1)
  console.log("Heartbeat recebido:", JSON.stringify(req.body));
  
  // O RustDesk Client pode enviar os dados de formas diferentes
  const { id, uuid, username, hostname, os } = req.body;
  const device_id = id || req.body.device_id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!device_id) {
    console.log("Aviso: Heartbeat sem device_id");
    return res.json({ status: "ok" }); // Retorna ok para o client não reclamar
  }

  try {
    await db.query(`
      INSERT INTO devices (device_id, uuid, username, hostname, ip_address, os, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (device_id) DO UPDATE SET
        uuid = EXCLUDED.uuid,
        username = EXCLUDED.username,
        hostname = EXCLUDED.hostname,
        ip_address = EXCLUDED.ip_address,
        os = EXCLUDED.os,
        last_seen = CURRENT_TIMESTAMP
    `, [device_id, uuid, username, hostname, ip, os]);

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Erro ao processar heartbeat no banco:", err);
    res.status(500).json({ status: "error" });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, ab.alias, ab.tags,
      CASE WHEN d.last_seen > NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_online
      FROM devices d
      LEFT JOIN address_book ab ON d.device_id = ab.device_id
      ORDER BY d.last_seen DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};

// Address Book - Salvar ou atualizar apelido
exports.saveAlias = async (req, res) => {
  const { device_id, alias, tags } = req.body;
  if (!device_id) return res.status(400).json({ error: "Missing device_id" });

  try {
    await db.query(`
      INSERT INTO address_book (device_id, alias, tags)
      VALUES ($1, $2, $3)
      ON CONFLICT (device_id) DO UPDATE SET
        alias = EXCLUDED.alias,
        tags = EXCLUDED.tags
    `, [device_id, alias, tags]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error saving alias:", err);
    res.status(500).json({ error: "Failed to save alias" });
  }
};

// Connection Logs - Capturar eventos
exports.logConnection = async (req, res) => {
  const { from_device_id, to_device_id, action, duration } = req.body;
  
  try {
    await db.query(`
      INSERT INTO connection_logs (from_device_id, to_device_id, action, duration)
      VALUES ($1, $2, $3, $4)
    `, [from_device_id, to_device_id, action, duration || 0]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error logging connection:", err);
    res.status(500).json({ error: "Failed to log connection" });
  }
};

// Relatórios de Conexão - Listar
exports.getReports = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT cl.*, 
             f.alias as from_alias, 
             t.alias as to_alias
      FROM connection_logs cl
      LEFT JOIN address_book f ON cl.from_device_id = f.device_id
      LEFT JOIN address_book t ON cl.to_device_id = t.device_id
      ORDER BY cl.timestamp DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// --- ENDPOINTS PARA O RUSTDESK CLIENT (Sincronização do Livro de Endereços) ---

exports.getAb = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.device_id as id, ab.alias as name, d.os, d.username, ab.tags
      FROM devices d
      LEFT JOIN address_book ab ON d.device_id = ab.device_id
      WHERE ab.alias IS NOT NULL
    `);
    
    // O RustDesk espera um JSON com uma lista de objetos
    res.json(result.rows.map(item => ({
      id: item.id,
      name: item.name,
      os: item.os,
      user: item.username,
      tags: item.tags ? item.tags.split(',') : []
    })));
  } catch (err) {
    console.error("Error fetching AB for client:", err);
    res.status(500).json([]);
  }
};
