const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  console.log('[MIGRATION] Iniciando migrações...');
  
  try {
    // Verifica se a coluna conn_id existe
    const connIdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'connection_logs' 
        AND column_name = 'conn_id'
    `);

    if (connIdCheck.rows.length === 0) {
      console.log('[MIGRATION] Adicionando coluna conn_id...');
      await pool.query(`ALTER TABLE connection_logs ADD COLUMN conn_id TEXT`);
      console.log('[MIGRATION] Coluna conn_id adicionada com sucesso!');
    } else {
      console.log('[MIGRATION] Coluna conn_id já existe.');
    }

    // Verifica se a coluna session_id existe
    const sessionIdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'connection_logs' 
        AND column_name = 'session_id'
    `);

    if (sessionIdCheck.rows.length === 0) {
      console.log('[MIGRATION] Adicionando coluna session_id...');
      await pool.query(`ALTER TABLE connection_logs ADD COLUMN session_id TEXT`);
      console.log('[MIGRATION] Coluna session_id adicionada com sucesso!');
    } else {
      console.log('[MIGRATION] Coluna session_id já existe.');
    }

    // Cria índices (se não existirem)
    const connIdIndexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'connection_logs' 
        AND indexname = 'idx_connection_logs_conn_id'
    `);

    if (connIdIndexCheck.rows.length === 0) {
      console.log('[MIGRATION] Criando índice idx_connection_logs_conn_id...');
      await pool.query(`CREATE INDEX idx_connection_logs_conn_id ON connection_logs (conn_id)`);
      console.log('[MIGRATION] Índice idx_connection_logs_conn_id criado com sucesso!');
    } else {
      console.log('[MIGRATION] Índice idx_connection_logs_conn_id já existe.');
    }

    const sessionIdIndexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'connection_logs' 
        AND indexname = 'idx_connection_logs_session_id'
    `);

    if (sessionIdIndexCheck.rows.length === 0) {
      console.log('[MIGRATION] Criando índice idx_connection_logs_session_id...');
      await pool.query(`CREATE INDEX idx_connection_logs_session_id ON connection_logs (session_id)`);
      console.log('[MIGRATION] Índice idx_connection_logs_session_id criado com sucesso!');
    } else {
      console.log('[MIGRATION] Índice idx_connection_logs_session_id já existe.');
    }

    console.log('[MIGRATION] Migrações concluídas com sucesso!');
  } catch (err) {
    console.error('[MIGRATION] Erro ao executar migrações:', err);
  } finally {
    await pool.end();
  }
}

runMigrations();
