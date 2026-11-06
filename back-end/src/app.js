const express = require('express');
const cors = require('cors');
const { getPool } = require('./config/db');
const { isDatabaseConfigured } = require('./config/env');
const cardsRoutes = require('./routes/cards.routes');
const collectionsRoutes = require('./routes/collections.routes');
const usersRoutes = require('./routes/users.routes');
const pricesRoutes = require('./routes/prices.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health/live', (req, res) => {
  res.json({ ok: true });
});

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

app.get('/health/database-check', async (req, res) => {
  const checks = [];

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.push('select-1');
    await pool.query('SELECT id FROM users LIMIT 1');
    checks.push('users-id');
    await pool.query('SELECT id FROM users WHERE email_user = "probe.invalid@example.com" LIMIT 1');
    checks.push('users-email');
    return res.json({ ok: true, checks });
  } catch (error) {
    console.error(`Diagnostico do banco falhou: ${error.message}`);
    return res.status(503).json({ ok: false, checks, error: error.message });
  }
});

app.use('/cards', cardsRoutes);
app.use('/collections', collectionsRoutes);
app.use('/users', usersRoutes);
app.use('/prices', pricesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

module.exports = app;