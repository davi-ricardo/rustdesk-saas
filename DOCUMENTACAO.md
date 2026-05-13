# Documentação Completa do Projeto RustDesk SaaS

## Estrutura Geral do Projeto
```
rustdesk-saas/
├── api/                    # Backend Node.js (Express + PostgreSQL)
├── frontend/               # Frontend React (Vite)
├── data/                   # Dados do servidor RustDesk (chaves, configs)
├── pgdata/                 # Dados persistentes do PostgreSQL (volume original)
├── pgdata_new/             # Dados temporários do PostgreSQL (usados em teste)
├── rustdesk-saas/          # Pasta com cópia antiga do projeto (opcional)
├── docker-compose.yml       # Arquivo de orquestração Docker
├── README.md                # Documentação original do projeto
└── DOCUMENTACAO.md          # Este arquivo!
```

---

## 1. Pasta `api/` - Backend
Esta é a pasta do servidor backend, desenvolvido em Node.js com o framework Express.

### Estrutura da Pasta `api/`
```
api/
├── src/
│   ├── controllers/         # Lógica de negócio das rotas
│   │   ├── auth.js          # Controlador de autenticação (login)
│   │   ├── groups.js        # Controlador de grupos/departamentos
│   │   ├── rustdesk.js      # Controlador principal (dispositivos, relatórios, etc.)
│   │   ├── serviceCategories.js  # Controlador de tipos de serviço
│   │   └── users.js         # Controlador de usuários do painel
│   ├── middleware/
│   │   └── auth.js          # Middleware de autenticação (verifica token JWT)
│   ├── routes/              # Definição das rotas HTTP
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── rustdesk.js
│   │   ├── serviceCategories.js
│   │   └── users.js
│   ├── db.js                # Conexão com o banco de dados PostgreSQL
│   └── index.js             # Arquivo principal do servidor (inicialização)
├── Dockerfile               # Dockerfile para buildar a imagem do backend
└── package.json             # Dependências do Node.js
```

### Arquivos Principais do Backend

#### `api/src/index.js`
Este é o arquivo que inicializa o servidor Express. Ele:
1. Carrega as variáveis de ambiente
2. Configura o CORS (para permitir requisições do frontend)
3. Define as rotas da API
4. Inicializa o banco de dados (cria as tabelas se não existirem)
5. Inicia o servidor na porta 3000

#### `api/src/db.js`
Arquivo responsável por criar a conexão com o banco de dados PostgreSQL usando a biblioteca `pg`.

#### `api/src/middleware/auth.js`
Contém 2 middlewares:
- `authenticate`: Verifica se o token JWT é válido e atribui o usuário à requisição
- `adminOnly`: Verifica se o usuário tem role `admin`

#### `api/src/controllers/rustdesk.js`
O controlador mais completo, com funções para:
- `getServerInfo`: Retorna as configurações do servidor RustDesk (ID Server, Relay Server, Key)
- `updateServerInfo`: Atualiza as configurações do servidor
- `heartbeat`: Recebe o heartbeat dos clientes RustDesk e atualiza o status dos dispositivos
- `getDevices`: Lista todos os dispositivos conectados
- `saveAlias`: Salva ou atualiza o apelido e grupo de um dispositivo
- `logConnection`: Registra logs de conexão dos dispositivos
- `getReports`: Lista os relatórios de conexão
- `updateLogCategory`: Atualiza a categoria de um log
- `exportXLS`: Exporta relatórios para arquivo Excel (XLSX)
- `sysinfo`: Endpoint para o cliente RustDesk enviar informações do sistema
- `getAb`: Retorna o livro de endereços para o cliente RustDesk
- `ingestHbbrLogs`: Recebe logs do HBBR

---

## 2. Pasta `frontend/` - Frontend
Esta é a pasta da interface web, desenvolvida em React com Vite.

### Estrutura da Pasta `frontend/`
```
frontend/
├── src/
│   ├── services/
│   │   └── api.js           # Configuração do Axios (cliente HTTP)
│   ├── App.jsx              # Componente principal da interface
│   └── main.jsx             # Arquivo de entrada do React
├── index.html               # HTML base
├── Dockerfile               # Dockerfile para buildar a imagem do frontend
├── vite.config.js           # Configuração do Vite
└── package.json             # Dependências do React
```

### Arquivos Principais do Frontend

#### `frontend/src/services/api.js`
Configura o Axios para fazer requisições à API:
- Define a URL base da API (localhost ou IP da VPS)
- Adiciona um interceptor que inclui automaticamente o token JWT no header `Authorization` de todas as requisições

#### `frontend/src/App.jsx`
Componente principal da aplicação, com:
- Sistema de login/logout
- Abas: Dispositivos, Grupos, Relatórios, Tipos de Serviço, Usuários
- Funções para gerenciar cada entidade (criar, editar, excluir)
- Exibição de erros detalhados

---

## 3. Pasta `data/`
Contém os dados do servidor RustDesk (HBBS/HBBR):
- Arquivos de chave pública e privada (`id_ed25519`, `id_ed25519.pub`)
- Outros arquivos de configuração do RustDesk

**Aviso**: Esta pasta é montada como volume no container da API em modo somente leitura (`ro`).

---

## 4. Pastas `pgdata/` e `pgdata_new/`
Ambas são volumes do Docker para persistir os dados do PostgreSQL:
- `pgdata/`: Volume original do banco de dados (usado na VPS)
- `pgdata_new/`: Volume temporário criado durante os testes

---

## 5. Arquivo `docker-compose.yml`
Arquivo de orquestração Docker que define e gerencia todos os containers do projeto:

### Serviços Definidos
1. **`postgresdb` (ou `postgres`)**: Banco de dados PostgreSQL 15
   - Usuário: `rustdesk`
   - Senha: `rustdesk123`
   - Banco: `rustdesk`
   - Volume: `./pgdata:/var/lib/postgresql/data`

2. **`api`**: Backend Node.js
   - Builda a partir da pasta `./api`
   - Porta: 3000
   - Variáveis de ambiente importantes:
     - `DATABASE_URL`: URL de conexão com o PostgreSQL
     - `JWT_SECRET`: Chave secreta para assinar tokens JWT
     - `ID_SERVER`, `RELAY_SERVER`: IP do servidor RustDesk
     - `RUSTDESK_KEY`: Chave pública do RustDesk
     - `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Credenciais do usuário administrador

3. **`frontend`**: Frontend React
   - Builda a partir da pasta `./frontend`
   - Porta: 8080 (servido por Nginx)

4. **`hbbs` e `hbbr`**: Servidores RustDesk
   - Imagem oficial: `rustdesk/rustdesk-server:latest`
   - Usam `network_mode: host` na VPS para acessar diretamente as portas do host

---

## 6. Tabelas do Banco de Dados
O banco de dados PostgreSQL possui 8 tabelas:

1. **`users`**: Usuários do painel administrativo
2. **`app_settings`**: Configurações do aplicativo
3. **`hbbr_sessions`**: Sessões do HBBR
4. **`devices`**: Dispositivos conectados ao RustDesk
5. **`address_book`**: Livro de endereços (apelidos e grupos dos dispositivos)
6. **`groups`**: Grupos/departamentos
7. **`service_categories`**: Tipos de serviço para classificar relatórios
8. **`connection_logs`**: Logs de conexão entre dispositivos

---

## 7. Como Funciona o Fluxo de Autenticação
1. O usuário faz login no painel com e-mail/username e senha
2. A API verifica as credenciais e retorna um token JWT
3. O frontend armazena o token no `localStorage`
4. Em todas as requisições subsequentes, o frontend envia o token no header `Authorization`
5. O middleware `authenticate` verifica o token e permite (ou não) o acesso à rota

---

## 8. Como Rodar o Projeto
### Local (Desenvolvimento)
```bash
# Clone o repositório
git clone https://github.com/davi-ricardo/rustdesk-saas.git
cd rustdesk-saas

# Suba os containers
docker-compose up -d --build

# Acesse o painel
# Frontend: http://localhost:8080
# API: http://localhost:3000
```

### Produção (VPS)
1. Acesse a VPS via SSH
2. Navegue até o diretório do projeto (ex: `/opt/rustdesk-saas`)
3. Atualize o código: `git pull origin main`
4. Redeploy os containers: `docker-compose up -d --build`
5. Certifique-se de que as portas estão abertas no firewall:
   - 8080 (TCP): Frontend
   - 3000 (TCP): API
   - 21115-21119 (TCP/UDP): RustDesk nativo

---

## 9. Credenciais Padrão
- **E-mail/Username**: `administrador`
- **Senha**: `tipref#2026` (ou a que você configurou no `docker-compose.yml`)

---

## 10. Tecnologias Utilizadas
| Camada | Tecnologias |
|--------|--------------|
| Frontend | React, Axios, Vite |
| Backend | Node.js, Express, JWT, pg (PostgreSQL) |
| Banco de Dados | PostgreSQL 15 |
| Infraestrutura | Docker, Docker Compose |
| Servidor RustDesk | HBBS/HBBR (imagem oficial) |

---

Desenvolvido por Davi Ricardo
