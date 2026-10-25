const express = require('express');
const cors = require('cors');
const { getPool } = require('./config/db');
const { isDatabaseConfigured } = require('./config/env');
const cardsRoutes = require('./routes/cards.routes');
const collectionsRoutes = require('./routes/collections.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ ok: false, database: false });
  }

  try {
    const pool = getPool();
    await pool.execute('SELECT 1');

    return res.json({ ok: true, database: true });
  } catch (error) {
    console.error(`Health check do banco falhou: ${error.message}`);
    return res.status(503).json({ ok: false, database: false });
  }
});

app.use('/cards', cardsRoutes);
app.use('/collections', collectionsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

module.exports = app;