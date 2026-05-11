const fs = require('fs');
const XLSX = require('xlsx');
const db = require("../db");

const parseMaybeJson = (value) => {
  if (value && typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return value;
      }
    }
  }
  return value;
};

const normalizeBody = (body) => {
  const parsed = parseMaybeJson(body);
  if (parsed && typeof parsed === "object") return parsed;
  return {};
};

const pickFirst = (obj, paths) => {
  for (const path of paths) {
    const parts = path.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== "object" || !(part in cur)) {
        ok = false;
        break;
      }
      cur = cur[part];
    }
    if (ok && cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return undefined;
};

exports.getServerInfo = (req, res) => {
  try {
    const publicKeyPath = '/root/id_ed25519.pub';
    let publicKey = process.env.RUSTDESK_KEY || '';

    if (!publicKey && fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
    }

    res.json({
      idServer: process.env.ID_SERVER || '76.13.174.204',
      relayServer: process.env.RELAY_SERVER || '76.13.174.204',
      key: publicKey || 'Key not found'
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
  const body = normalizeBody(req.body);
  console.log("Heartbeat recebido:", JSON.stringify(body));
  
  // O RustDesk Client pode enviar os dados de formas diferentes
  const { id, uuid, username, hostname, os } = body;
  const device_id = id || body.device_id;
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
  const body = normalizeBody(req.body);
  const queryBody = req.query && typeof req.query === "object" ? req.query : {};
  const merged = { ...queryBody, ...body };
  console.log("Log de conexão recebido:", JSON.stringify({ path: req.path, body: merged }));
  
  const final_from = pickFirst(merged, [
    "from_device_id",
    "from",
    "src_id",
    "source_id",
    "source",
    "client_id",
    "id",
    "data.from_device_id",
    "data.from",
    "data.src_id",
    "data.source_id",
    "data.client_id",
    "data.id"
  ]);

  const final_to = pickFirst(merged, [
    "to_device_id",
    "to",
    "dst_id",
    "dest_id",
    "target_id",
    "target",
    "peer_id",
    "data.to_device_id",
    "data.to",
    "data.dst_id",
    "data.dest_id",
    "data.target_id",
    "data.target",
    "data.peer_id"
  ]);

  const final_action = pickFirst(merged, [
    "action",
    "type",
    "event",
    "data.action",
    "data.type",
    "data.event"
  ]);

  const duration = pickFirst(merged, ["duration", "data.duration", "seconds", "data.seconds"]);

  if (!final_from || !final_to) {
    return res.json({ status: "ok" }); // Retorna ok para o client
  }

  try {
    await db.query(
      `
      INSERT INTO connection_logs (from_device_id, to_device_id, action, duration)
      VALUES ($1, $2, $3, $4)
      `,
      [String(final_from), String(final_to), final_action ? String(final_action) : null, duration ? parseInt(duration, 10) || 0 : 0]
    );
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

// Atualizar categoria de um log
exports.updateLogCategory = async (req, res) => {
  const { id } = req.params;
  const { category_id } = req.body;
  
  try {
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

// Exportar relatório para XLS
exports.exportXLS = async (req, res) => {
  const { month, year } = req.query;
  
  try {
    let query = `
      SELECT 
        cl.timestamp as data_hora,
        COALESCE(f.alias, cl.from_device_id) as tecnico_origem,
        COALESCE(t.alias, cl.to_device_id) as destino,
        sc.name as tipo_servico,
        cl.action as acao,
        cl.duration as duracao_segundos
      FROM connection_logs cl
      LEFT JOIN address_book f ON cl.from_device_id = f.device_id
      LEFT JOIN address_book t ON cl.to_device_id = t.device_id
      LEFT JOIN service_categories sc ON cl.category_id = sc.id
    `;
    const params = [];
    
    if (month && year) {
      query += ` WHERE EXTRACT(MONTH FROM cl.timestamp) = $1 AND EXTRACT(YEAR FROM cl.timestamp) = $2`;
      params.push(month, year);
    }
    
    query += ` ORDER BY cl.timestamp DESC`;
    
    const result = await db.query(query, params);
    
    // Preparar dados para XLS
    const data = result.rows.map(row => ({
      "Data/Hora": row.data_hora ? new Date(row.data_hora).toLocaleString('pt-BR') : '',
      "Técnico (Origem)": row.tecnico_origem || '',
      "Destino": row.destino || '',
      "Tipo de Serviço": row.tipo_servico || '',
      "Ação": row.acao === 'start' ? 'Iniciada' : row.acao === 'end' ? 'Finalizada' : row.acao || '',
      "Duração (segundos)": row.duracao_segundos || ''
    }));
    
    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 18 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Conexões");
    
    // Enviar arquivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_rustdesk.xlsx');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
    
  } catch (err) {
    console.error("Error exporting XLS:", err);
    res.status(500).json({ error: "Failed to export XLS" });
  }
};

exports.sysinfo = async (req, res) => {
  const body = normalizeBody(req.body);
  console.log("Sysinfo recebido:", JSON.stringify(body));

  const device_id = pickFirst(body, ["id", "device_id", "data.id", "data.device_id"]);
  const uuid = pickFirst(body, ["uuid", "data.uuid"]);
  const username = pickFirst(body, ["username", "user", "data.username", "data.user"]);
  const hostname = pickFirst(body, ["hostname", "host", "data.hostname", "data.host"]);
  const os = pickFirst(body, ["os", "platform", "data.os", "data.platform"]);
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
    if (device_id) {
      await db.query(
        `
        INSERT INTO devices (device_id, uuid, username, hostname, ip_address, os, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (device_id) DO UPDATE SET
          uuid = COALESCE(EXCLUDED.uuid, devices.uuid),
          username = COALESCE(EXCLUDED.username, devices.username),
          hostname = COALESCE(EXCLUDED.hostname, devices.hostname),
          ip_address = COALESCE(EXCLUDED.ip_address, devices.ip_address),
          os = COALESCE(EXCLUDED.os, devices.os),
          last_seen = CURRENT_TIMESTAMP
        `,
        [String(device_id), uuid ? String(uuid) : null, username ? String(username) : null, hostname ? String(hostname) : null, ip ? String(ip) : null, os ? String(os) : null]
      );
    }

    const final_from = pickFirst(body, [
      "from_device_id",
      "from",
      "src_id",
      "source_id",
      "source",
      "client_id",
      "data.from_device_id",
      "data.from",
      "data.src_id",
      "data.source_id",
      "data.client_id"
    ]);

    const final_to = pickFirst(body, [
      "to_device_id",
      "to",
      "dst_id",
      "dest_id",
      "target_id",
      "target",
      "peer_id",
      "data.to_device_id",
      "data.to",
      "data.dst_id",
      "data.dest_id",
      "data.target_id",
      "data.target",
      "data.peer_id"
    ]);

    const final_action = pickFirst(body, ["action", "type", "event", "data.action", "data.type", "data.event"]);
    const duration = pickFirst(body, ["duration", "seconds", "data.duration", "data.seconds"]);

    if (final_from && final_to) {
      await db.query(
        `
        INSERT INTO connection_logs (from_device_id, to_device_id, action, duration)
        VALUES ($1, $2, $3, $4)
        `,
        [String(final_from), String(final_to), final_action ? String(final_action) : null, duration ? parseInt(duration, 10) || 0 : 0]
      );
      console.log("Sysinfo gerou log de conexão:", JSON.stringify({ from: final_from, to: final_to, action: final_action, duration }));
    }

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("Erro ao processar sysinfo:", err);
    return res.status(500).json({ status: "error" });
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
