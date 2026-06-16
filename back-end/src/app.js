const express = require('express');
const cors = require('cors');
const cardsRoutes = require('./routes/cards.routes');
const collectionsRoutes = require('./routes/collections.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/cards', cardsRoutes);
app.use('/collections', collectionsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

module.exports = app;