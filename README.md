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

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/davi-ricardo/rustdesk-saas.git
   cd rustdesk-saas
   ```

2. **Configuração de Variáveis de Ambiente:**
   No arquivo `docker-compose.yml`, ajuste as variáveis da seção `api` para apontar para o seu servidor RustDesk (se já tiver um rodando em VPS):
   - `ID_SERVER`: IP da sua VPS.
   - `RELAY_SERVER`: IP da sua VPS.
   - `RUSTDESK_KEY`: A chave pública (`.pub`) do seu servidor RustDesk.

3. **Suba os containers:**
   ```bash
   docker-compose up -d --build
   ```

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
