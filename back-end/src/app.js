const express = require('express');
const cors = require('cors');
const cardsRoutes = require('./routes/cards.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/cards', cardsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

module.exports = app;