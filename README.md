# RustDesk SaaS - Painel de Gerenciamento Centralizado

Este projeto é um painel de gerenciamento SaaS para servidores **RustDesk**. Ele permite que você centralize o controle de seus servidores de conexão (HBBS/HBBR), rastreie dispositivos online e forneça uma interface amigável para os usuários configurarem seus clientes RustDesk.

## 🚀 Funcionalidades e Como Utilizar

O painel foi evoluído para ser uma ferramenta completa de gestão de suporte e infraestrutura. Abaixo estão as funções disponíveis e como aproveitá-las:

### 📱 1. Gerenciamento de Dispositivos (Livro de Endereços)
- **O que faz**: Lista todos os computadores que utilizam o seu servidor RustDesk.
- **Como usar**: 
    - Os IDs aparecem automaticamente assim que o RustDesk Client é configurado com sua API.
    - Clique em **Editar** para dar um **Apelido** (Ex: "PC Financeiro 01") para facilitar a identificação.
    - Visualize o status em tempo real (Online/Offline) através dos indicadores coloridos.

### 🏢 2. Grupos por Departamento
- **O que faz**: Permite organizar os IDs por setores da empresa (RH, TI, Vendas, etc.).
- **Como usar**:
    - Vá na aba **Grupos (Departamentos)** para criar e gerenciar os setores.
    - Na aba **Dispositivos**, edite um computador e vincule-o ao grupo correspondente.
    - Utilize o botão **Ver IDs** dentro de um grupo para filtrar rapidamente apenas as máquinas daquele setor.
    - No topo da lista de dispositivos, use o filtro por grupo para uma navegação rápida.

### 📜 3. Relatórios de Conexão (Auditoria)
- **O que faz**: Registra o histórico de quem acessou qual máquina e por quanto tempo.
- **Como usar**:
    - Acesse a aba **Relatórios** para ver os logs de conexões iniciadas e finalizadas.
    - O sistema identifica automaticamente o apelido do técnico (origem) e do cliente (destino).
    - Útil para auditoria de segurança e controle de produtividade da equipe de suporte.

### 👥 4. Gerenciamento de Usuários
- **O que faz**: Controla quem tem permissão para acessar o painel administrativo.
- **Como usar**:
    - Na aba **Usuários**, crie contas para seus técnicos.
    - Defina níveis de acesso (**Admin** ou **User**).
    - O sistema permite login tanto pelo **Nome de Usuário** quanto pelo **E-mail**.

### 🔗 5. Sincronização Nativa com RustDesk App
- **O que faz**: Alimenta o "Address Book" do próprio aplicativo RustDesk.
- **Como usar**:
    - Ao logar no aplicativo RustDesk do seu computador usando as credenciais do painel, todos os contatos que você nomeou no dashboard aparecerão automaticamente na lista do app, organizados e prontos para conexão.

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
