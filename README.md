# Collection Pokémon TCG

Sistema web para gerenciamento de coleção de cartas do Pokémon Trading Card Game (TCG), permitindo que usuários organizem sua coleção, acompanhem valores das cartas e gerenciem seu inventário de forma prática.

## ✨ Funcionalidades

- 👤 Cadastro e login de usuários
- 🔐 Autenticação com JWT
- 🃏 Visualização de cartas
- 📚 Gerenciamento da coleção pessoal
- 💰 Exibição de preços em BRL e USD
- 📈 Controle de quantidade de cartas
- 🔎 Busca e filtros

---

## 🛠 Tecnologias

### Front-end

- React 19
- React Router DOM
- Axios
- Font Awesome
- CSS

### Back-end

- Node.js
- Express
- MySQL
- JWT
- bcryptjs
- dotenv

---

## 📂 Estrutura do projeto

```
Collection-Pokemon-TCG
│
├── front-end/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── back-end/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   └── modules/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Instalação

### Clone o projeto

```bash
git clone https://github.com/JoaoLuisVagos/Collection-Pokemon-TCG.git
```

### Backend

```bash
cd back-end
npm install
```

Crie um arquivo `.env`:

```env
PORT=3001

DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=
```

Execute:

```bash
npm run dev
```

---

### Front-end

```bash
cd front-end
npm install
npm start
```

---

## 🗄 Banco de dados

O projeto utiliza MySQL.

As migrations estão em:

```
back-end/src/database/migrations
```

---

## 🚀 Scripts

### Front-end

```bash
npm start
npm test
```

### Back-end

```bash
npm run dev
npm start
```

---

## 📌 Funcionalidades futuras

- Favoritar cartas
- Dashboard de estatísticas
- Histórico de preços
- Importação de coleção
- Exportação para CSV
- Dark Mode
- Phone Visual

---

## 👨‍💻 Autor

João Luis Vagos

GitHub:
https://github.com/JoaoLuisVagos

---

## 📄 Licença

Projeto desenvolvido para fins de estudo.
