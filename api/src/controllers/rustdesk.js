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
  // Log para depuração na VPS - LOGA TUDO, inclusive as chaves!
  console.log("=" .repeat(60));
  console.log("[LOG] Nova requisição de conexão recebida!");
  console.log("[LOG] Caminho da requisição:", req.path);
  console.log("[LOG] Método:", req.method);
  console.log("[LOG] Body completo (raw):", JSON.stringify(req.body, null, 2));
  console.log("[LOG] Chaves do body:", Object.keys(req.body));
  console.log("=" .repeat(60));
  
  // Captura MUITOS formatos possíveis que o RustDesk pode enviar
  const body = req.body;
  
  // Log detalhado para entender o fluxo
  console.log("[LOG-DETALHADO] Iniciando análise do body...");
  
  // Se tem o campo "peer" (array), usa body.id e peer[0] como os dois IDs
  let final_from, final_to;
  if (body.peer && Array.isArray(body.peer) && body.peer.length >= 1) {
    final_from = body.id;
    final_to = body.peer[0];
    console.log("[LOG-DETALHADO] Body tem peer array! final_from =", final_from, "final_to =", final_to);
  } else {
    // Tenta encontrar o dispositivo de origem (técnico)
    final_from = 
      body.from_device_id || 
      body.from_id || 
      body.src_id || 
      body.source_id || 
      body.id || 
      body.from ||
      body.peer_id ||
      body.local_id; // Talvez seja esse!
    
    // Tenta encontrar o dispositivo de destino (cliente)
    final_to = 
      body.to_device_id || 
      body.to_id || 
      body.dst_id || 
      body.target_id || 
      body.target ||
      body.to ||
      body.remote_id ||
      body.peer_id || // Talvez o peer_id seja o destino?
      body.id; // Ou o id seja o destino?
    console.log("[LOG-DETALHADO] Body SEM peer array! final_from =", final_from, "final_to =", final_to);
  }
  
  // Tenta encontrar a ação
  let final_action = 
    body.action || 
    body.type || 
    body.event ||
    (body.connected ? 'start' : null) ||
    (body.disconnected ? 'end' : null) ||
    (body.status === 'connected' ? 'start' : null) ||
    (body.status === 'disconnected' ? 'end' : null);
  
  // Se tem peer, assume que é "start"
  if (body.peer && Array.isArray(body.peer) && body.peer.length >= 1) {
    final_action = 'start';
  }
  
  // Se ação é "new", assume que é "start"
  if (final_action === 'new') {
    final_action = 'start';
  }
  
  // Se não tem ação e tem type=0, assume que é "start"
  if (!final_action && body.type === 0) {
    final_action = 'start';
  }
  console.log("[LOG-DETALHADO] final_action =", final_action);
  
  // Tenta encontrar a duração
  const final_duration = 
    body.duration || 
    body.seconds ||
    body.time ||
    0;

  // Captura conn_id e session_id
  const conn_id = body.conn_id || null;
  const session_id = body.session_id || null;
  console.log("[LOG-DETALHADO] conn_id =", conn_id, "session_id =", session_id);

  // Log para depuração
  console.log("[LOG] Log processado:", { 
    final_from, 
    final_to, 
    final_action, 
    final_duration,
    conn_id,
    session_id
  });

  // Se só tiver um ID, usamos ele como um e o outro como null
  if (!final_action) {
    console.log("[LOG] Faltando ação, não salvando log.");
    return res.json({ status: "ok" }); // Retorna ok para o client não reclamar
  }
  
  // Se ação é "new" e não tem peer, não salva (o request com peer vai salvar como start)
  if (final_action === 'start' && body.action === 'new' && !body.peer) {
    console.log("[LOG] Ação 'new' sem peer, não salvando log (esperando request com peer).");
    return res.json({ status: "ok" }); // Retorna ok para o client não reclamar
  }

  // Se não tiver from ou to, procura o log de "start" mais recente para o mesmo conn_id ou session_id
  let save_from = final_from || null;
  let save_to = final_to || null;
  
  // Calcula a duração automaticamente se for um "close" e temos um "start"
  let calculatedDuration = final_duration;
  if ((final_action === 'close' || final_action === 'end') && (conn_id || session_id)) {
    try {
      // Procura o log de "start" mais recente
      let startLog = null;
      if (conn_id) {
        const resultConn = await db.query(`
          SELECT id, timestamp, from_device_id, to_device_id FROM connection_logs 
          WHERE conn_id = $1 
            AND (action = 'start' OR action = 'open')
          ORDER BY timestamp DESC 
          LIMIT 1
        `, [conn_id]);
        if (resultConn.rows.length > 0) {
          startLog = resultConn.rows[0];
        }
      }
      if (!startLog && session_id) {
        const resultSession = await db.query(`
          SELECT id, timestamp, from_device_id, to_device_id FROM connection_logs 
          WHERE session_id = $1 
            AND (action = 'start' OR action = 'open')
          ORDER BY timestamp DESC 
          LIMIT 1
        `, [session_id]);
        if (resultSession.rows.length > 0) {
          startLog = resultSession.rows[0];
        }
      }

      // Se encontrou o log de start
      if (startLog) {
        console.log("[LOG] Log de start encontrado:", startLog);
        console.log("[LOG-DEBUG] Horário atual do servidor (new Date()):", new Date());
        console.log("[LOG-DEBUG] Horário do start log (startLog.timestamp):", new Date(startLog.timestamp));
        // SEMPRE usa os from e to do log de start, independentemente do que veio no close!
        save_from = startLog.from_device_id;
        save_to = startLog.to_device_id;
        // Calcula a duração usando o timestamp diretamente do banco!
        const startDate = new Date(startLog.timestamp);
        const endDate = new Date();
        console.log("[LOG-DEBUG] startDate:", startDate);
        console.log("[LOG-DEBUG] endDate:", endDate);
        console.log("[LOG-DEBUG] Diferença em ms:", (endDate - startDate));
        calculatedDuration = Math.floor((endDate - startDate) / 1000);
        // Garante que a duração não é negativa!
        if (calculatedDuration < 0) {
          calculatedDuration = 0;
        }
        console.log("[LOG] Duração calculada automaticamente:", calculatedDuration, "segundos");
        console.log("[LOG] Usando from e to do log de start:", { save_from, save_to });
      } else {
        console.log("[LOG] Nenhum log de start encontrado para conn_id:", conn_id, "session_id:", session_id);
      }
    } catch (err) {
      console.error("[LOG] Erro ao calcular duração automaticamente:", err);
    }
  }

  try {
    // Verifica se já existe um log com os mesmos dados nos últimos 5 segundos (evita duplicatas)
    const checkResult = await db.query(`
      SELECT id FROM connection_logs 
      WHERE from_device_id IS NOT DISTINCT FROM $1 
        AND to_device_id IS NOT DISTINCT FROM $2 
        AND action = $3 
        AND conn_id IS NOT DISTINCT FROM $4
        AND session_id IS NOT DISTINCT FROM $5
        AND timestamp >= NOW() - INTERVAL '5 seconds'
    `, [save_from, save_to, final_action, conn_id, session_id]);

    if (checkResult.rows.length > 0) {
      console.log("[LOG] Log duplicado detectado, não salvando.");
      return res.json({ status: "ok" });
    }

    // Insere o novo log
    await db.query(`
      INSERT INTO connection_logs (from_device_id, to_device_id, action, duration, conn_id, session_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [save_from, save_to, final_action, calculatedDuration, conn_id, session_id]);
    console.log("[LOG] Log salvo com sucesso no banco!");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("[LOG] Erro ao salvar log:", err);
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
             sc.name as category_name,
             fd.username as from_username,
             fd.hostname as from_hostname,
             td.username as to_username,
             td.hostname as to_hostname
      FROM connection_logs cl
      LEFT JOIN address_book f ON cl.from_device_id = f.device_id
      LEFT JOIN address_book t ON cl.to_device_id = t.device_id
      LEFT JOIN devices fd ON cl.from_device_id = fd.device_id
      LEFT JOIN devices td ON cl.to_device_id = td.device_id
      LEFT JOIN service_categories sc ON cl.category_id = sc.id
      ORDER BY cl.timestamp DESC
      LIMIT 100
    `);
    
    // Formata o retorno para usar alias, se existir, senão username@hostname, senão o ID RustDesk
    const formatted = result.rows.map(row => ({
      ...row,
      from_alias: row.from_alias || (row.from_username && row.from_hostname ? `${row.from_username}@${row.from_hostname}` : (row.from_device_id || 'Desconhecido')),
      to_alias: row.to_alias || (row.to_username && row.to_hostname ? `${row.to_username}@${row.to_hostname}` : (row.to_device_id || 'Desconhecido'))
    }));
    
    res.json(formatted);
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

exports.swapLogFromTo = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`
      UPDATE connection_logs 
      SET from_device_id = to_device_id, 
          to_device_id = from_device_id 
      WHERE id = $1
    `, [id]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error swapping log from/to:", err);
    res.status(500).json({ error: "Failed to swap log from/to" });
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
    console.log("=" .repeat(60));
    console.log("[LOG] HBBR logs received!");
    console.log("[LOG] Body completo (raw):", req.body);
    console.log("=" .repeat(60));
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Error ingesting HBBR logs:", err);
    res.status(500).json({ error: "Failed to ingest logs" });
  }
};
