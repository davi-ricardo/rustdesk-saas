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
  const { id, uuid, username, hostname, os } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!id) return res.json({ status: "error", message: "Missing ID" });

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
    `, [id, uuid, username, hostname, ip, os]);

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Heartbeat error:", err);
    res.status(500).json({ status: "error" });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *, 
      CASE WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_online
      FROM devices 
      ORDER BY last_seen DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};
