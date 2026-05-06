import { useState, useEffect } from 'react'
import api from './services/api'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [error, setError] = useState('')
  const [serverInfo, setServerInfo] = useState(null)
  const [devices, setDevices] = useState([])
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('devices') 
  const [editingDevice, setEditingDevice] = useState(null)
  const [newAlias, setNewAlias] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')

  const fetchServerInfo = async () => {
    try {
      const response = await api.get('/api/rustdesk/server-info')
      setServerInfo(response.data)
    } catch (err) { console.error('Erro ao buscar info do servidor') }
  }

  const fetchDevices = async () => {
    try {
      const response = await api.get('/api/rustdesk/devices')
      setDevices(response.data)
    } catch (err) { console.error('Erro ao buscar dispositivos') }
  }

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/rustdesk/reports')
      setReports(response.data)
    } catch (err) { console.error('Erro ao buscar relatórios') }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users')
      setUsers(response.data)
    } catch (err) { console.error('Erro ao buscar usuários') }
  }

  useEffect(() => {
    if (token) {
      fetchServerInfo()
      fetchDevices()
      if (activeTab === 'reports') fetchReports()
      if (activeTab === 'users') fetchUsers()
      
      const interval = setInterval(() => {
        fetchDevices()
        if (activeTab === 'reports') fetchReports()
        if (activeTab === 'users') fetchUsers()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [token, activeTab])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token: newToken } = response.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
    } catch (err) { setError('Credenciais inválidas ou erro no servidor') }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setServerInfo(null)
    setDevices([])
    setReports([])
    setUsers([])
  }

  const handleSaveAlias = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/rustdesk/alias', { 
        device_id: editingDevice.device_id, 
        alias: newAlias 
      })
      setEditingDevice(null)
      fetchDevices()
    } catch (err) { alert('Erro ao salvar apelido') }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/users', { email: newUserEmail, password: newUserPass, role: newUserRole })
      setNewUserEmail('')
      setNewUserPass('')
      fetchUsers()
      alert('Usuário criado!')
    } catch (err) { alert('Erro ao criar usuário') }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Excluir este usuário?')) return
    try {
      await api.delete(`/api/users/${id}`)
      fetchUsers()
    } catch (err) { alert('Erro ao excluir usuário') }
  }

  if (token) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          <h1 style={{ color: '#333' }}>RustDesk SaaS Panel</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}>Sair</button>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setActiveTab('devices')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'devices' ? '#007bff' : '#eee', color: activeTab === 'devices' ? 'white' : '#333' }}>Dispositivos</button>
          <button onClick={() => setActiveTab('reports')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'reports' ? '#007bff' : '#eee', color: activeTab === 'reports' ? 'white' : '#333' }}>Relatórios</button>
          <button onClick={() => setActiveTab('users')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'users' ? '#007bff' : '#eee', color: activeTab === 'users' ? 'white' : '#333' }}>Usuários</button>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '0 0 8px 8px', border: '1px solid #dee2e6', borderTop: 'none' }}>
          
          {activeTab === 'devices' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h3 style={{ marginTop: 0 }}>Configurações VPS</h3>
                <div style={{ textAlign: 'left', background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                  <p style={{ margin: '5px 0' }}><strong>IP Server:</strong><br /> <code style={{ color: '#d63384' }}>{serverInfo?.idServer}</code></p>
                  <p style={{ margin: '15px 0 5px 0' }}><strong>Key:</strong><br /> <code style={{ wordBreak: 'break-all', fontSize: '0.85em', color: '#d63384' }}>{serverInfo?.key}</code></p>
                </div>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Livro de Endereços</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Apelido / Nome</th>
                      <th style={{ padding: '10px' }}>ID RustDesk</th>
                      <th style={{ padding: '10px' }}>Sistema</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(device => (
                      <tr key={device.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: device.is_online ? '#28a745' : '#dc3545', marginRight: '5px' }}></span>
                          {device.is_online ? 'Online' : 'Offline'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: '#007bff' }}>{device.alias || 'Sem Apelido'}</strong><br />
                          <span style={{ fontSize: '0.8em', color: '#666' }}>{device.username}@{device.hostname}</span>
                        </td>
                        <td style={{ padding: '10px' }}><code>{device.device_id}</code></td>
                        <td style={{ padding: '10px', fontSize: '0.9em' }}>{device.os}</td>
                        <td style={{ padding: '10px' }}><button onClick={() => { setEditingDevice(device); setNewAlias(device.alias || '') }} style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Histórico de Conexões</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '10px' }}>Data/Hora</th>
                    <th style={{ padding: '10px' }}>Origem (Técnico)</th>
                    <th style={{ padding: '10px' }}>Destino (Cliente)</th>
                    <th style={{ padding: '10px' }}>Ação</th>
                    <th style={{ padding: '10px' }}>Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontSize: '0.9em' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>{log.from_alias || log.from_device_id || 'Desconhecido'}</td>
                      <td style={{ padding: '10px' }}>{log.to_alias || log.to_device_id}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: log.action === 'start' ? '#d4edda' : '#f8d7da', color: log.action === 'start' ? '#155724' : '#721c24' }}>
                          {log.action === 'start' ? 'Iniciada' : 'Finalizada'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{log.duration ? `${log.duration}s` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h3 style={{ marginTop: 0 }}>Novo Usuário</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Usuário ou E-mail" style={{ padding: '8px' }} required />
                  <input type="password" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} placeholder="Senha" style={{ padding: '8px' }} required />
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ padding: '8px' }}>
                    <option value="user">Usuário (Técnico)</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Criar</button>
                </form>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Lista de Usuários</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px' }}>E-mail</th>
                      <th style={{ padding: '10px' }}>Nível</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{u.email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: u.role === 'admin' ? '#fff3cd' : '#e2e3e5' }}>{u.role}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {u.email !== email && (
                            <button onClick={() => handleDeleteUser(u.id)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}>Excluir</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {editingDevice && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', minWidth: '300px' }}>
              <h3>Editar Apelido</h3>
              <form onSubmit={handleSaveAlias}>
                <input type="text" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px' }} autoFocus />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingDevice(null)}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#007bff' }}>RustDesk SaaS</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="text"
          placeholder="Usuário ou E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          required
        />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
        <button type="submit" style={{ padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Entrar</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
    </div>
  )
}

export default App
