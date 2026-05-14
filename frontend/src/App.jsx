import { useState, useEffect } from 'react'
import api from './services/api'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('currentUser') || 'null'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverInfo, setServerInfo] = useState(null)
  const [editingServerInfo, setEditingServerInfo] = useState(false)
  const [editIdServer, setEditIdServer] = useState('')
  const [editRelayServer, setEditRelayServer] = useState('')
  const [editRustdeskKey, setEditRustdeskKey] = useState('')
  const [devices, setDevices] = useState([])
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [activeTab, setActiveTab] = useState('devices') 
  const [filterGroupId, setFilterGroupId] = useState('')
  const [editingDevice, setEditingDevice] = useState(null)
  const [newAlias, setNewAlias] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [editingUser, setEditingUser] = useState(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserPass, setEditUserPass] = useState('')
  const [editUserRole, setEditUserRole] = useState('user')
  
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [editingGroup, setEditingGroup] = useState(null)
  const [serviceCategories, setServiceCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingLog, setEditingLog] = useState(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()))

  const fetchServerInfo = async () => {
    try {
      const response = await api.get('/api/server-info')
      setServerInfo(response.data)
      if (!editingServerInfo) {
        setEditIdServer(response.data?.idServer || '')
        setEditRelayServer(response.data?.relayServer || '')
        setEditRustdeskKey(response.data?.key || '')
      }
    } catch (err) { console.error('Erro ao buscar info do servidor') }
  }

  const handleSaveServerInfo = async (e) => {
    e.preventDefault()
    try {
      await api.put('/api/server-info', {
        idServer: editIdServer,
        relayServer: editRelayServer,
        key: editRustdeskKey
      })
      setEditingServerInfo(false)
      fetchServerInfo()
      alert('Configurações atualizadas!')
    } catch (err) { alert('Erro ao atualizar configurações') }
  }

  const fetchDevices = async () => {
    try {
      const response = await api.get('/api/devices')
      setDevices(response.data)
    } catch (err) { console.error('Erro ao buscar dispositivos') }
  }

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/reports')
      setReports(response.data)
    } catch (err) { console.error('Erro ao buscar relatórios') }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users')
      setUsers(response.data)
    } catch (err) { console.error('Erro ao buscar usuários') }
  }

  const fetchGroups = async () => {
    try {
      const response = await api.get('/api/groups')
      setGroups(response.data)
    } catch (err) { console.error('Erro ao buscar grupos') }
  }

  const fetchServiceCategories = async () => {
    try {
      const response = await api.get('/api/service-categories')
      setServiceCategories(response.data)
    } catch (err) { 
      console.error('Erro detalhado ao buscar categorias:', err)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await api.put(`/api/service-categories/${editingCategory.id}`, { name: newCategoryName, description: newCategoryDesc })
      } else {
        await api.post('/api/service-categories', { name: newCategoryName, description: newCategoryDesc })
      }
      setNewCategoryName('')
      setNewCategoryDesc('')
      setEditingCategory(null)
      fetchServiceCategories()
    } catch (err) { 
      console.error('Erro detalhado:', err)
      alert('Erro ao gerenciar categoria: ' + (err.response?.data?.error || err.message)) 
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Excluir esta categoria? Logs vinculados ficarão sem categoria.')) return
    try {
      await api.delete(`/api/service-categories/${id}`)
      fetchServiceCategories()
    } catch (err) { 
      console.error('Erro detalhado:', err)
      alert('Erro ao excluir categoria: ' + (err.response?.data?.error || err.message)) 
    }
  }

  const handleSaveLogCategory = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/api/reports/${editingLog.id}/category`, { 
        category_id: selectedCategoryId ? parseInt(selectedCategoryId) : null 
      })
      setEditingLog(null)
      setSelectedCategoryId('')
      fetchReports()
    } catch (err) { alert('Erro ao salvar categoria do log') }
  }

  const handleExportXLS = async () => {
    try {
      const response = await api.get(`/api/reports/export/xls?month=${exportMonth}&year=${exportYear}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio_rustdesk_${exportMonth}_${exportYear}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) { alert('Erro ao exportar relatório') }
  }

  useEffect(() => {
    if (token) {
      fetchServerInfo()
      fetchDevices()
      fetchGroups()
      if (currentUser?.role === 'admin') {
        fetchServiceCategories()
      }
      if (activeTab === 'reports') fetchReports()
      if (activeTab === 'users' && currentUser?.role === 'admin') fetchUsers()
      
      const interval = setInterval(() => {
        fetchDevices()
        fetchGroups()
        if (currentUser?.role === 'admin') {
          fetchServiceCategories()
        }
        if (activeTab === 'reports') fetchReports()
        if (activeTab === 'users' && currentUser?.role === 'admin') fetchUsers()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [token, activeTab, currentUser])

  useEffect(() => {
    if (activeTab === 'service-categories' && currentUser?.role !== 'admin') {
      setActiveTab('devices')
    }
    if (activeTab === 'users' && currentUser?.role !== 'admin') {
      setActiveTab('devices')
    }
  }, [activeTab, currentUser])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token: newToken, user } = response.data
      localStorage.setItem('token', newToken)
      localStorage.setItem('currentUser', JSON.stringify(user))
      setToken(newToken)
      setCurrentUser(user)
    } catch (err) {
      const errorMsg = err.response?.data?.error
      if (errorMsg === 'User is disabled') {
        setError('Este usuário está desativado')
      } else {
        setError(errorMsg || 'Erro de conexão com o servidor')
      }
    } finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    setToken(null)
    setCurrentUser(null)
    setServerInfo(null)
    setDevices([])
    setReports([])
    setUsers([])
    setGroups([])
  }

  const handleSaveAlias = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/alias', { 
        device_id: editingDevice.device_id, 
        alias: newAlias,
        group_id: newGroupId || null
      })
      setEditingDevice(null)
      fetchDevices()
    } catch (err) { alert('Erro ao salvar apelido') }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    try {
      if (editingGroup) {
        await api.put(`/api/groups/${editingGroup.id}`, { name: newGroupName, description: newGroupDesc })
      } else {
        await api.post('/api/groups', { name: newGroupName, description: newGroupDesc })
      }
      setNewGroupName('')
      setNewGroupDesc('')
      setEditingGroup(null)
      fetchGroups()
    } catch (err) { alert('Erro ao gerenciar grupo') }
  }

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Excluir este grupo? Dispositivos vinculados ficarão sem grupo.')) return
    try {
      await api.delete(`/api/groups/${id}`)
      fetchGroups()
      fetchDevices()
    } catch (err) { alert('Erro ao excluir grupo') }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/users', { username: newUserName, email: newUserEmail, password: newUserPass, role: newUserRole })
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPass('')
      fetchUsers()
      alert('Usuário criado!')
    } catch (err) { alert('Erro ao criar usuário') }
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      const userData = {
        username: editUserName,
        email: editUserEmail,
        role: editUserRole
      }
      if (editUserPass) {
        userData.password = editUserPass
      }
      await api.put(`/api/users/${editingUser.id}`, userData)
      setEditingUser(null)
      setEditUserName('')
      setEditUserEmail('')
      setEditUserPass('')
      fetchUsers()
      alert('Usuário atualizado!')
    } catch (err) { alert('Erro ao atualizar usuário') }
  }

  const handleToggleUserStatus = async (id, isActive) => {
    const confirmMsg = isActive ? 'Desativar este usuário?' : 'Ativar este usuário?'
    if (!window.confirm(confirmMsg)) return
    try {
      await api.put(`/api/users/${id}/toggle`)
      fetchUsers()
    } catch (err) { alert('Erro ao atualizar status do usuário') }
  }

  if (token) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          <h1 style={{ color: '#333' }}>RemoteOps Panel</h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}>Sair</button>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('devices')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'devices' ? '#007bff' : '#eee', color: activeTab === 'devices' ? 'white' : '#333' }}>Dispositivos</button>
          <button onClick={() => setActiveTab('groups')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'groups' ? '#007bff' : '#eee', color: activeTab === 'groups' ? 'white' : '#333' }}>Grupos (Departamentos)</button>
          <button onClick={() => setActiveTab('reports')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'reports' ? '#007bff' : '#eee', color: activeTab === 'reports' ? 'white' : '#333' }}>Relatórios</button>
          {currentUser?.role === 'admin' && (
            <button onClick={() => setActiveTab('service-categories')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'service-categories' ? '#007bff' : '#eee', color: activeTab === 'service-categories' ? 'white' : '#333' }}>Tipos de Serviço</button>
          )}
          {currentUser?.role === 'admin' && (
            <button onClick={() => setActiveTab('users')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '4px 4px 0 0', background: activeTab === 'users' ? '#007bff' : '#eee', color: activeTab === 'users' ? 'white' : '#333' }}>Usuários</button>
          )}
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '0 0 8px 8px', border: '1px solid #dee2e6', borderTop: 'none' }}>
          
          {activeTab === 'devices' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Configurações VPS</h3>
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => {
                        if (editingServerInfo) {
                          setEditingServerInfo(false)
                          setEditIdServer(serverInfo?.idServer || '')
                          setEditRelayServer(serverInfo?.relayServer || '')
                          setEditRustdeskKey(serverInfo?.key || '')
                        } else {
                          setEditingServerInfo(true)
                        }
                      }}
                      style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      {editingServerInfo ? 'Cancelar' : 'Editar'}
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'left', background: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                  {!editingServerInfo && (
                    <>
                      <p style={{ margin: '5px 0' }}><strong>ID Server:</strong><br /> <code style={{ color: '#d63384' }}>{serverInfo?.idServer}</code></p>
                      <p style={{ margin: '15px 0 5px 0' }}><strong>Relay Server:</strong><br /> <code style={{ color: '#d63384' }}>{serverInfo?.relayServer}</code></p>
                      <p style={{ margin: '15px 0 5px 0' }}><strong>Key:</strong><br /> <code style={{ wordBreak: 'break-all', fontSize: '0.85em', color: '#d63384' }}>{serverInfo?.key}</code></p>
                    </>
                  )}

                  {editingServerInfo && currentUser?.role === 'admin' && (
                    <form onSubmit={handleSaveServerInfo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>ID Server:</label>
                        <input value={editIdServer} onChange={(e) => setEditIdServer(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Relay Server:</label>
                        <input value={editRelayServer} onChange={(e) => setEditRelayServer(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Key:</label>
                        <textarea value={editRustdeskKey} onChange={(e) => setEditRustdeskKey(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '80px' }} />
                      </div>
                      <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Salvar
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>Livro de Endereços</h3>
                  <div>
                    <label style={{ fontSize: '0.9em', marginRight: '10px' }}>Filtrar por Grupo:</label>
                    <select 
                      value={filterGroupId} 
                      onChange={(e) => setFilterGroupId(e.target.value)}
                      style={{ padding: '5px', borderRadius: '4px' }}
                    >
                      <option value="">Todos os Grupos</option>
                      <option value="none">Sem Grupo (Geral)</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Apelido / Nome</th>
                      <th style={{ padding: '10px' }}>Grupo</th>
                      <th style={{ padding: '10px' }}>ID RemoteOps</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices
                      .filter(d => {
                        if (!filterGroupId) return true;
                        if (filterGroupId === 'none') return !d.group_id;
                        return d.group_id == filterGroupId;
                      })
                      .map(device => (
                      <tr key={device.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: device.is_online ? '#28a745' : '#dc3545', marginRight: '5px' }}></span>
                          {device.is_online ? 'Online' : 'Offline'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: '#007bff' }}>{device.alias || 'Sem Apelido'}</strong><br />
                          <span style={{ fontSize: '0.8em', color: '#666' }}>{device.username}@{device.hostname}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', background: '#e9ecef', borderRadius: '4px', fontSize: '0.8em' }}>
                            {device.group_name || 'Geral'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}><code>{device.device_id}</code></td>
                        <td style={{ padding: '10px' }}><button onClick={() => { setEditingDevice(device); setNewAlias(device.alias || ''); setNewGroupId(device.group_id || '') }} style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h3 style={{ marginTop: 0 }}>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h3>
                <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nome do Departamento (Ex: RH)" style={{ padding: '8px' }} required />
                  <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Descrição" style={{ padding: '8px' }} />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      {editingGroup ? 'Atualizar' : 'Criar Grupo'}
                    </button>
                    {editingGroup && <button type="button" onClick={() => { setEditingGroup(null); setNewGroupName(''); setNewGroupDesc('') }} style={{ padding: '10px' }}>Cancelar</button>}
                  </div>
                </form>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Lista de Departamentos</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px' }}>Nome</th>
                      <th style={{ padding: '10px' }}>Descrição</th>
                      <th style={{ padding: '10px' }}>Dispositivos</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}><strong>{g.name}</strong></td>
                        <td style={{ padding: '10px', fontSize: '0.9em', color: '#666' }}>{g.description}</td>
                        <td style={{ padding: '10px' }}>{g.device_count}</td>
                        <td style={{ padding: '10px' }}>
                          <button 
                            onClick={() => { setFilterGroupId(g.id); setActiveTab('devices') }}
                            style={{ marginRight: '10px', cursor: 'pointer', background: '#e7f3ff', color: '#007bff', border: '1px solid #007bff', borderRadius: '4px', padding: '4px 8px' }}
                          >
                            Ver IDs
                          </button>
                          <button onClick={() => { setEditingGroup(g); setNewGroupName(g.name); setNewGroupDesc(g.description || '') }} style={{ marginRight: '10px', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => handleDeleteGroup(g.id)} style={{ color: 'red', cursor: 'pointer' }}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Histórico de Conexões</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.9em' }}>Mês:</label>
                  <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} style={{ padding: '6px', borderRadius: '4px' }}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <label style={{ fontSize: '0.9em' }}>Ano:</label>
                  <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} style={{ padding: '6px', borderRadius: '4px' }}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button onClick={handleExportXLS} style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Exportar XLS
                  </button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '10px' }}>Data/Hora</th>
                    <th style={{ padding: '10px' }}>Origem (Técnico)</th>
                    <th style={{ padding: '10px' }}>Destino (Cliente)</th>
                    <th style={{ padding: '10px' }}>Tipo de Serviço</th>
                    <th style={{ padding: '10px' }}>Ação</th>
                    <th style={{ padding: '10px' }}>Duração</th>
                    <th style={{ padding: '10px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(log => {
                    // Formata o timestamp usando o timezone do navegador
                    let formattedDate = '-';
                    if (log.timestamp) {
                      const date = new Date(log.timestamp);
                      formattedDate = date.toLocaleString();
                    }

                    // Formata o tempo de duração
                    let formattedDuration = '-';
                    if (log.duration && log.duration > 0) {
                      const minutes = Math.floor(log.duration / 60);
                      const seconds = Math.floor(log.duration % 60);
                      if (minutes > 0) {
                        formattedDuration = `${minutes}m ${seconds}s`;
                      } else {
                        formattedDuration = `${seconds}s`;
                      }
                    }

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontSize: '0.9em' }}>{formattedDate}</td>
                        <td style={{ padding: '10px' }}>{log.from_alias || log.from_device_id || 'Desconhecido'}</td>
                        <td style={{ padding: '10px' }}>{log.to_alias || log.to_device_id}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: log.category_name ? '#e7f3ff' : '#e9ecef', color: log.category_name ? '#007bff' : '#666' }}>
                            {log.category_name || 'Não classificado'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: log.action === 'start' ? '#d4edda' : '#f8d7da', color: log.action === 'start' ? '#155724' : '#721c24' }}>
                            {log.action === 'start' ? 'Iniciada' : 'Finalizada'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>{formattedDuration}</td>
                        <td style={{ padding: '10px' }}>
                          <button 
                            onClick={() => { setEditingLog(log); setSelectedCategoryId(log.category_id || '') }}
                            style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}
                          >
                            Classificar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'service-categories' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h3 style={{ marginTop: 0 }}>{editingCategory ? 'Editar Tipo' : 'Novo Tipo de Serviço'}</h3>
                <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome (Ex: Problema na impressora)" style={{ padding: '8px' }} required />
                  <textarea value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} placeholder="Descrição" style={{ padding: '8px' }} />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      {editingCategory ? 'Atualizar' : 'Criar Tipo'}
                    </button>
                    {editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setNewCategoryName(''); setNewCategoryDesc('') }} style={{ padding: '10px' }}>Cancelar</button>}
                  </div>
                </form>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Tipos de Serviço</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px' }}>Nome</th>
                      <th style={{ padding: '10px' }}>Descrição</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceCategories.map(cat => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}><strong>{cat.name}</strong></td>
                        <td style={{ padding: '10px', fontSize: '0.9em', color: '#666' }}>{cat.description}</td>
                        <td style={{ padding: '10px' }}>
                          <button 
                            onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); setNewCategoryDesc(cat.description || '') }}
                            style={{ marginRight: '10px', cursor: 'pointer' }}
                          >
                            Editar
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} style={{ color: 'red', cursor: 'pointer' }}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h3 style={{ marginTop: 0 }}>Novo Usuário</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome de Usuário (opcional)" style={{ padding: '8px' }} />
                  <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail" style={{ padding: '8px' }} required />
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
                      <th style={{ padding: '10px' }}>Usuário</th>
                      <th style={{ padding: '10px' }}>E-mail</th>
                      <th style={{ padding: '10px' }}>Nível</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #eee', opacity: u.is_active ? 1 : 0.6 }}>
                        <td style={{ padding: '10px' }}>{u.username || '-'}</td>
                        <td style={{ padding: '10px' }}>{u.email}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: u.role === 'admin' ? '#fff3cd' : '#e2e3e5' }}>{u.role}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', background: u.is_active ? '#d4edda' : '#f8d7da', color: u.is_active ? '#155724' : '#721c24' }}>
                            {u.is_active ? 'Ativo' : 'Desativado'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => { 
                              setEditingUser(u)
                              setEditUserName(u.username || '')
                              setEditUserEmail(u.email)
                              setEditUserRole(u.role)
                              setEditUserPass('')
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}
                          >
                            Editar
                          </button>
                          {u.username !== 'administrador' && (
                            <button 
                              onClick={() => handleToggleUserStatus(u.id, u.is_active)} 
                              style={{ 
                                color: u.is_active ? '#dc3545' : '#28a745', 
                                cursor: 'pointer', 
                                border: 'none', 
                                background: 'none',
                                fontWeight: 'bold',
                                fontSize: '0.8em'
                              }}
                            >
                              {u.is_active ? 'Desativar' : 'Ativar'}
                            </button>
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
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', minWidth: '400px' }}>
              <h3>Editar Dispositivo</h3>
              <form onSubmit={handleSaveAlias}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Apelido (Nome amigável):</label>
                  <input type="text" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} placeholder="Ex: PC do Suporte" autoFocus />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Departamento / Grupo:</label>
                  <select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    <option value="">Nenhum (Geral)</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingDevice(null)} style={{ padding: '8px 15px' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingLog && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', minWidth: '400px' }}>
              <h3>Classificar Log</h3>
              <form onSubmit={handleSaveLogCategory}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Tipo de Serviço:</label>
                  <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    <option value="">Não classificado</option>
                    {serviceCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setEditingLog(null); setSelectedCategoryId('') }} style={{ padding: '8px 15px' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', minWidth: '400px' }}>
              <h3>Editar Usuário</h3>
              <form onSubmit={handleSaveUser}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Nome de Usuário:</label>
                  <input type="text" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} placeholder="Ex: joao.silva" />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>E-mail:</label>
                  <input type="email" value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} required />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Nova Senha (deixe vazio para manter):</label>
                  <input type="password" value={editUserPass} onChange={(e) => setEditUserPass(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} placeholder="Nova senha" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Nível:</label>
                  <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    <option value="user">Usuário (Técnico)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setEditingUser(null); setEditUserName(''); setEditUserEmail(''); setEditUserPass('') }} style={{ padding: '8px 15px' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        maxWidth: '400px',
        width: '100%',
        margin: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '48px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}>RemoteOps</div>
          <p style={{ color: '#666', margin: 0 }}>Sistema de acesso remoto</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#333', fontSize: '0.9em', fontWeight: '500' }}>Usuário ou E-mail</label>
            <input 
              type="text" 
              placeholder="Digite seu usuário ou e-mail"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={{ 
                padding: '14px 16px', 
                borderRadius: '8px', 
                border: '2px solid #e0e0e0',
                fontSize: '16px',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              required 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#333', fontSize: '0.9em', fontWeight: '500' }}>Senha</label>
            <input 
              type="password" 
              placeholder="Digite sua senha"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ 
                padding: '14px 16px', 
                borderRadius: '8px', 
                border: '2px solid #e0e0e0',
                fontSize: '16px',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              padding: '14px', 
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
        {error && (
          <div style={{ 
            marginTop: '20px', 
            padding: '12px', 
            background: '#fff3f3', 
            border: '1px solid #ffc9c9', 
            borderRadius: '8px', 
            color: '#c92a2a' 
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
