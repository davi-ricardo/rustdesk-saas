-- Adiciona colunas conn_id e session_id na tabela connection_logs
ALTER TABLE connection_logs
ADD COLUMN conn_id TEXT,
ADD COLUMN session_id TEXT;

-- Cria índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_connection_logs_conn_id ON connection_logs (conn_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_session_id ON connection_logs (session_id);
