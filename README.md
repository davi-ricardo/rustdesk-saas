# RemoteOps SaaS - Painel de Gerenciamento Centralizado

Este projeto é um painel de gerenciamento SaaS completo para servidores **RustDesk**. Ele permite centralizar o controle de seus servidores de conexão (HBBS/HBBR), gerenciar dispositivos, grupos, usuários, relatórios e tipos de serviço, tudo em uma interface amigável.

## 🚀 Funcionalidades e Como Utilizar

O painel é uma ferramenta completa de gestão de suporte e infraestrutura. Abaixo estão as funções disponíveis:

### 📱 1. Gerenciamento de Dispositivos (Livro de Endereços)
- **O que faz**: Lista todos os computadores que utilizam o seu servidor RustDesk.
- **Recursos**:
  - IDs aparecem automaticamente ao configurar o RustDesk Client com sua API
  - Atribuição de apelidos amigáveis (ex: "PC Financeiro 01")
  - Status em tempo real (Online/Offline) com indicadores coloridos
  - Filtro por grupos/departamentos

### 🏢 2. Grupos por Departamento
- **O que faz**: Organiza os dispositivos por setores da empresa (RH, TI, Vendas, etc.).
- **Recursos**:
  - Criação e gerenciamento de grupos
  - Vinculação de dispositivos a grupos
  - Botão "Ver IDs" para filtrar rapidamente dispositivos de um grupo
  - Filtro por grupo na lista de dispositivos

### 📜 3. Relatórios de Conexão (Auditoria)
- **O que faz**: Registra o histórico de quem acessou qual máquina e por quanto tempo.
- **Recursos**:
  - Logs de conexões iniciadas e finalizadas
  - Identificação automática de técnico (origem) e cliente (destino)
  - Classificação de logs por **Tipos de Serviço**
  - **Exportação para Excel (XLSX)** por mês/ano
  - Útil para auditoria de segurança e controle de produtividade

### 🏷️ 4. Tipos de Serviço
- **O que faz**: Cria categorias para classificar os atendimentos (ex: Problema na impressora, Instalação de software).
- **Recursos**:
  - Criação, edição e exclusão de categorias
  - Vinculação de categorias aos logs de conexão
  - Apenas administradores podem gerenciar tipos de serviço

### 👥 5. Gerenciamento de Usuários
- **O que faz**: Controla quem tem permissão para acessar o painel administrativo.
- **Recursos**:
  - Criação de contas para técnicos
  - Níveis de acesso: **Admin** (acesso total) ou **User** (acesso limitado)
  - Login tanto por **Nome de Usuário** quanto por **E-mail**
  - Ativação/desativação de usuários

### 🔗 6. Sincronização Nativa com RustDesk App
- **O que faz**: Alimenta o "Address Book" do próprio aplicativo RustDesk.
- **Como usar**:
  - Ao logar no RustDesk Client com as credenciais do painel, os contatos aparecem automaticamente na lista do app

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
|--------|--------------|
| Frontend | React, Axios, Vite |
| Backend | Node.js, Express, JWT, xlsx |
| Banco de Dados | PostgreSQL 15 |
| Infraestrutura | Docker, Docker Compose |
| Servidor RustDesk | HBBS/HBBR (imagem oficial) |

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

## ⚙️ Configuração e Instalação

### 💻 Local (Desenvolvimento)
1. **Clone o repositório:**
   ```bash
   git clone https://github.com/davi-ricardo/rustdesk-saas.git
   cd rustdesk-saas
   ```

2. **Ajuste o `docker-compose.yml` (opcional):**
   Configure IP da VPS, chave pública e credenciais admin.

3. **Suba os containers:**
   ```bash
   docker-compose up -d --build
   ```

### ☁️ Produção (VPS)
Projeto otimizado para implantação em VPS (ex: Ubuntu 22.04).

1. **Acesse sua VPS via SSH:**
   ```bash
   ssh root@seu-ip-vps
   ```

2. **Instale as dependências (se necessário):**
   ```bash
   apt update && apt install -y git docker docker-compose
   ```

3. **Clone o projeto na VPS:**
   ```bash
   cd /opt
   git clone https://github.com/davi-ricardo/rustdesk-saas.git
   cd rustdesk-saas
   ```

4. **Configuração de Firewall:**
   Libere as portas essenciais:
   - **8080 (TCP)**: Painel Web (Frontend)
   - **3000 (TCP)**: API e Sincronização de Clients
   - **21115-21119 (TCP/UDP)**: Protocolos nativos do RustDesk

   *Comando rápido (UFW):*
   ```bash
   ufw allow 8080,3000,21115:21119/tcp && ufw allow 21116/udp
   ```

5. **Deploy:**
   ```bash
   docker-compose up -d --build
   ```

## 🔐 Segurança e Acesso

Personalize as credenciais no `docker-compose.yml` (seção `environment` da `api`):

- `ADMIN_EMAIL`: Nome de usuário ou e-mail do admin (ex: `administrador`)
- `ADMIN_PASSWORD`: Senha segura do admin

> **Nota**: O sistema aceita login tanto por e-mail quanto por nome de usuário. Ao alterar esses valores e reiniciar o container, as credenciais são sincronizadas automaticamente com o banco.

## 🖥️ Como Acessar

Após o build, acesse:
- **Painel Administrativo**: [http://localhost:8080](http://localhost:8080) (ou IP da VPS)
- **API Backend**: [http://localhost:3000](http://localhost:3000)

### Credenciais Padrão:
- **Usuário/E-mail**: `administrador`
- **Senha**: `tipref#2026` (ou a que você configurou)

## 🔌 Configurando o RustDesk Client

Para que os dispositivos apareçam no painel:
1. Abra o RustDesk Client
2. Vá em **Configurações > Rede**
3. Preencha:
   - **ID Server**: IP do seu servidor
   - **Relay Server**: IP do seu servidor
   - **Key**: Chave pública (disponível no painel)
   - **API Server**: `http://SEU-IP:3000`

## 📂 Estrutura do Projeto

```text
rustdesk-saas/
├── api/                  # Backend Node.js (Express + PostgreSQL)
│   ├── src/
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── middleware/   # Autenticação JWT
│   │   ├── routes/       # Definição de rotas
│   │   ├── db.js         # Conexão com PostgreSQL
│   │   └── index.js      # Arquivo principal do servidor
│   ├── Dockerfile
│   └── package.json
├── frontend/             # Frontend React (Vite)
│   ├── src/
│   │   ├── services/     # Cliente HTTP (Axios)
│   │   ├── App.jsx       # Interface principal
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── data/                 # Dados e chaves do RustDesk
├── pgdata/               # Dados persistentes do PostgreSQL
├── DOCUMENTACAO.md       # Documentação completa do código
└── docker-compose.yml    # Orquestração Docker
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido por [Davi Ricardo](https://github.com/davi-ricardo)
