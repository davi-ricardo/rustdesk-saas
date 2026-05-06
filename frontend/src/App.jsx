import { useState, useEffect } from 'react'
import api from './services/api'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [error, setError] = useState('')
  const [serverInfo, setServerInfo] = useState(null)
  const [devices, setDevices] = useState([])

  const fetchServerInfo = async () => {
    try {
      const response = await api.get('/api/rustdesk/server-info')
      setServerInfo(response.data)
    } catch (err) {
      console.error('Erro ao buscar info do servidor')
    }
  }

  const fetchDevices = async () => {
    try {
      const response = await api.get('/api/rustdesk/devices')
      setDevices(response.data)
    } catch (err) {
      console.error('Erro ao buscar dispositivos')
    }
  }

  useEffect(() => {
    if (token) {
      fetchServerInfo()
      fetchDevices()
      const interval = setInterval(fetchDevices, 10000) // Atualiza a cada 10s
      return () => clearInterval(interval)
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token: newToken } = response.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
    } catch (err) {
      setError('Credenciais inválidas ou erro no servidor')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setServerInfo(null)
    setDevices([])
  }

  if (token) {
    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          <h1 style={{ color: '#333' }}>Dashboard RustDesk</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}>Sair</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
          {/* Coluna da Esquerda: Configurações */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ marginTop: 0 }}>Configurações de Rede</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>Dados para o seu RustDesk Client:</p>
            <div style={{ textAlign: 'left', background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #e9ecef' }}>
              <p style={{ margin: '5px 0' }}><strong>ID Server:</strong><br /> <code style={{ color: '#d63384' }}>{serverInfo?.idServer}</code></p>
              <p style={{ margin: '15px 0 5px 0' }}><strong>Key:</strong><br /> <code style={{ wordBreak: 'break-all', fontSize: '0.85em', color: '#d63384' }}>{serverInfo?.key}</code></p>
            </div>
          </div>

          {/* Coluna da Direita: Dispositivos */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ marginTop: 0 }}>Dispositivos Ativos</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>ID / Nome</th>
                  <th style={{ padding: '10px' }}>Sistema</th>
                  <th style={{ padding: '10px' }}>Último Visto</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Nenhum dispositivo registrado ainda.</td>
                  </tr>
                ) : (
                  devices.map(device => (
                    <tr key={device.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: device.is_online ? '#28a745' : '#dc3545',
                          marginRight: '5px'
                        }}></span>
                        {device.is_online ? 'Online' : 'Offline'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <strong>{device.device_id}</strong><br />
                        <span style={{ fontSize: '0.8em', color: '#666' }}>{device.username}@{device.hostname}</span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.9em' }}>{device.os}</td>
                      <td style={{ padding: '10px', fontSize: '0.8em', color: '#666' }}>
                        {new Date(device.last_seen).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#007bff' }}>RustDesk SaaS</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Gerenciamento Centralizado</p>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          required
        />
        <button type="submit" style={{ 
          padding: '12px', 
          cursor: 'pointer', 
          background: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          Entrar no Sistema
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
      <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9em' }}>
        <strong>Dica de Acesso:</strong><br />
        E-mail: admin@test.com<br />
        Senha: 123
      </div>
    </div>
  )
}

export default App
