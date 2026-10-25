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
- 🏆 Ordenação da coleção por raridade
- 🖼️ Fallback e normalização das imagens das cartas

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

### Aplicação publicada

- Front-end: https://collection-pokemon-qhpbyisq6-joao-luis-vagos.vercel.app
- API: https://collection-pokemon-tcg.onrender.com
- Health check: https://collection-pokemon-tcg.onrender.com/health

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
LANGUAGE_DISCOUNT_PERCENT=18
JWT_SECRET=seu-segredo-jwt
JWT_EXPIRES_IN=7d

MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=
MYSQL_SSL=false
```

Para conectar ao MySQL hospedado com SSL, preencha `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_DATABASE`, e use `MYSQL_SSL=true`. Nunca versionar o arquivo `.env` nem publicar credenciais.

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

Execute os arquivos SQL na ordem numérica (`001`, `002` e `003`) no banco configurado.

### Atualização de cartas

Para atualizar preços, raridades e imagens das cartas já cadastradas:

```bash
cd back-end
node src/scripts/attPricesCards.js
```

O script consulta novamente as fontes de cartas, aplica tentativas automáticas em caso de indisponibilidade temporária e preserva dados existentes quando a API não retornar algum campo.

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
