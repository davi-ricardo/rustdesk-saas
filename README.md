# RustDesk SaaS - Painel de Gerenciamento Centralizado

Este projeto é um painel de gerenciamento SaaS para servidores **RustDesk**. Ele permite que você centralize o controle de seus servidores de conexão (HBBS/HBBR), rastreie dispositivos online e forneça uma interface amigável para os usuários configurarem seus clientes RustDesk.

## 🚀 Funcionalidades

- **Dashboard Visual**: Interface moderna construída com React e Vite.
- **Gerenciamento de Dispositivos**: Lista em tempo real de dispositivos conectados, com status online/offline.
- **Integração com VPS**: Configurado para trabalhar com servidores RustDesk existentes em VPS.
- **Autenticação Segura**: Sistema de login com JWT (JSON Web Tokens).
- **Banco de Dados Real**: Armazenamento de usuários e dispositivos usando PostgreSQL.
- **Infraestrutura Docker**: Todo o ambiente (API, Frontend, Banco de Dados e RustDesk Server) roda em containers de fácil implantação.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, Axios, Vite.
- **Backend**: Node.js, Express.
- **Banco de Dados**: PostgreSQL.
- **Infraestrutura**: Docker e Docker Compose.
- **Servidor Remoto**: Compatível com o ecossistema RustDesk (HBBS/HBBR).

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
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

2. **Ajuste o `docker-compose.yml`:**
   Configure seu IP da VPS e a Key pública.

3. **Suba os containers:**
   ```bash
   docker-compose up -d --build
   ```

### ☁️ Produção (VPS)
Este projeto foi desenhado para ser facilmente implantado em uma VPS (ex: Ubuntu 22.04).

1. **Acesse sua VPS via SSH:**
   ```bash
   ssh root@seu-ip-vps
   ```

2. **Instale as dependências (se necessário):**
   Garanta que o `git`, `docker` e `docker-compose` estejam instalados.

3. **Clone o projeto na VPS:**
   ```bash
   cd /opt
   git clone https://github.com/davi-ricardo/rustdesk-saas.git
   cd rustdesk-saas
   ```

4. **Configuração de Firewall:**
   É essencial liberar as seguintes portas para o funcionamento pleno:
   - **8080 (TCP)**: Painel Web (Frontend).
   - **3000 (TCP)**: API e Sincronização de Clients.
   - **21115-21119 (TCP/UDP)**: Protocolos nativos do RustDesk (HBBS/HBBR).

   *Comando rápido (UFW):* `ufw allow 8080,3000,21115:21119/tcp && ufw allow 21116/udp`

5. **Deploy:**
   ```bash
   docker-compose up -d --build
   ```

## 🔐 Segurança e Acesso

O painel utiliza um sistema de login administrativo. Você pode personalizar as credenciais diretamente no `docker-compose.yml` na seção `environment` da `api`:

- `ADMIN_EMAIL`: Seu e-mail ou nome de usuário (ex: `administrador`).
- `ADMIN_PASSWORD`: Sua senha segura.

> **Nota:** O sistema aceita login tanto pelo e-mail quanto pelo nome de usuário configurado. Sempre que alterar esses valores no arquivo e reiniciar o container, as credenciais serão sincronizadas automaticamente com o banco de dados.

## 🖥️ Como Acessar

Após o build, o sistema estará disponível nos seguintes endereços:

- **Painel Administrativo**: [http://localhost:8080](http://localhost:8080)
- **API Backend**: [http://localhost:3000](http://localhost:3000)

### Credenciais Padrão (Login):
- **E-mail**: `admin@test.com`
- **Senha**: `123`

## 🔌 Configurando o RustDesk Client

Para que seus dispositivos apareçam no painel, configure o aplicativo RustDesk no computador do cliente:

1. Vá em **Configurações > Rede**.
2. No campo **ID Server** e **Relay Server**, coloque o IP configurado no painel.
3. No campo **Key**, cole a chave que aparece no seu Dashboard.
4. No campo **API Server**, coloque `http://seu-ip-da-api:3000`.

## 📂 Estrutura do Projeto

```text
rustdesk-saas/
├── api/             # Backend Node.js (Express + PostgreSQL)
├── frontend/        # Frontend React (Vite)
├── data/            # Dados e chaves do servidor RustDesk
├── pgdata/          # Dados persistentes do PostgreSQL (ignorado no git)
└── docker-compose.yml
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido por [Davi Ricardo](https://github.com/davi-ricardo)
