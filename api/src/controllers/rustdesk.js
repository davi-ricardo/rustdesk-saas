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
      SELECT d.*, ab.alias, ab.tags, ab.group_id, g.name as group_name,
      CASE WHEN d.last_seen > NOW() - INTERVAL '5 minutes' THEN true ELSE false END as is_online
      FROM devices d
      LEFT JOIN address_book ab ON d.device_id = ab.device_id
      LEFT JOIN groups g ON ab.group_id = g.id
      ORDER BY d.last_seen DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};

// Address Book - Salvar ou atualizar apelido e grupo
exports.saveAlias = async (req, res) => {
  const { device_id, alias, tags, group_id } = req.body;
  if (!device_id) return res.status(400).json({ error: "Missing device_id" });

  try {
    await db.query(`
      INSERT INTO address_book (device_id, alias, tags, group_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (device_id) DO UPDATE SET
        alias = EXCLUDED.alias,
        tags = EXCLUDED.tags,
        group_id = EXCLUDED.group_id
    `, [device_id, alias, tags, group_id || null]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error saving alias:", err);
    res.status(500).json({ error: "Failed to save alias" });
  }
};

// Connection Logs - Capturar eventos
exports.logConnection = async (req, res) => {
  // Log para depuração na VPS
  console.log("Log de conexão recebido:", JSON.stringify(req.body));
  
  // O RustDesk pode enviar no body ou como campos soltos
  const { from_device_id, to_device_id, action, duration, id, target_id, type } = req.body;
  
  // Mapeia os diferentes formatos possíveis do RustDesk
  const final_from = from_device_id || id;
  const final_to = to_device_id || target_id;
  const final_action = action || type;

  if (!final_from || !final_to) {
    return res.json({ status: "ok" }); // Retorna ok para o client
  }

  try {
    await db.query(`
      INSERT INTO connection_logs (from_device_id, to_device_id, action, duration)
      VALUES ($1, $2, $3, $4)
    `, [final_from, final_to, final_action, duration || 0]);
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
             t.alias as to_alias,
             sc.name as category_name
      FROM connection_logs cl
      LEFT JOIN address_book f ON cl.from_device_id = f.device_id
      LEFT JOIN address_book t ON cl.to_device_id = t.device_id
      LEFT JOIN service_categories sc ON cl.category_id = sc.id
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

exports.updateServerInfo = async (req, res) => {
  try {
    const { idServer, relayServer, key } = req.body;
    await db.query(`
      INSERT INTO app_settings (key, value) VALUES
      ('id_server', $1),
      ('relay_server', $2),
      ('rustdesk_key', $3)
      ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = CURRENT_TIMESTAMP
    `, [idServer, relayServer, key]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error updating server info:", err);
    res.status(500).json({ error: "Failed to update server info" });
  }
};

exports.updateLogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.body;
    await db.query(
      "UPDATE connection_logs SET category_id = $1 WHERE id = $2",
      [category_id || null, id]
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error updating log category:", err);
    res.status(500).json({ error: "Failed to update log category" });
  }
};

exports.exportXLS = async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await db.query(`
      SELECT cl.*, 
             f.alias as from_alias, 
             t.alias as to_alias,
             sc.name as category_name
      FROM connection_logs cl
      LEFT JOIN address_book f ON cl.from_device_id = f.device_id
      LEFT JOIN address_book t ON cl.to_device_id = t.device_id
      LEFT JOIN service_categories sc ON cl.category_id = sc.id
      WHERE EXTRACT(MONTH FROM cl.timestamp) = $1 
        AND EXTRACT(YEAR FROM cl.timestamp) = $2
      ORDER BY cl.timestamp DESC
    `, [month, year]);

    const XLSX = require('xlsx');
    const data = result.rows.map(row => ({
      'Data/Hora': new Date(row.timestamp).toLocaleString(),
      'Origem (Técnico)': row.from_alias || row.from_device_id || 'Desconhecido',
      'Destino (Cliente)': row.to_alias || row.to_device_id,
      'Tipo de Serviço': row.category_name || 'Não classificado',
      'Ação': row.action === 'start' ? 'Iniciada' : 'Finalizada',
      'Duração (s)': row.duration || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_rustdesk_${month}_${year}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error("Error exporting XLS:", err);
    res.status(500).json({ error: "Failed to export XLS" });
  }
};

exports.sysinfo = (req, res) => {
  res.json({ status: "ok" });
};

exports.ingestHbbrLogs = async (req, res) => {
  try {
    console.log("HBBR logs received:", JSON.stringify(req.body));
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error ingesting HBBR logs:", err);
    res.status(500).json({ error: "Failed to ingest logs" });
  }
};
