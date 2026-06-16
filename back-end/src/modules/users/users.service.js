const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../../config/db');
const { env, isDatabaseConfigured } = require('../../config/env');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name_user,
    email: row.email_user,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildAuthPayload(user) {
  return {
    token: jwt.sign(
      {
        sub: String(user.id),
        email: user.email_user,
      },
      env.auth.jwtSecret,
      { expiresIn: env.auth.jwtExpiresIn }
    ),
    user: sanitizeUser(user),
  };
}

function assertDatabaseReady() {
  if (!isDatabaseConfigured()) {
    const error = new Error('Banco de dados nao configurado.');
    error.statusCode = 503;
    throw error;
  }
}

async function findUserByEmail(email) {
  assertDatabaseReady();

  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email_user = ? LIMIT 1',
    [normalizeEmail(email)]
  );

  return rows[0] || null;
}

async function findUserById(id) {
  assertDatabaseReady();

  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [Number(id)]
  );

  return rows[0] || null;
}

async function createUser({ name, email, password }) {
  assertDatabaseReady();

  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(name || '').trim();
  const passwordValue = String(password || '');

  if (!trimmedName) {
    const error = new Error('Informe o nome do usuario.');
    error.statusCode = 400;
    throw error;
  }

  if (!normalizedEmail) {
    const error = new Error('Informe o email do usuario.');
    error.statusCode = 400;
    throw error;
  }

  if (passwordValue.length < 6) {
    const error = new Error('A senha precisa ter pelo menos 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Ja existe um usuario com este email.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(passwordValue, 10);
  const pool = getPool();

  const [result] = await pool.execute(
    'INSERT INTO users (name_user, email_user, password_user) VALUES (?, ?, ?)',
    [trimmedName, normalizedEmail, passwordHash]
  );

  const createdUser = await findUserById(result.insertId);
  return buildAuthPayload(createdUser);
}

async function loginUser({ email, password }) {
  assertDatabaseReady();

  const normalizedEmail = normalizeEmail(email);
  const passwordValue = String(password || '');

  if (!normalizedEmail || !passwordValue) {
    const error = new Error('Informe email e senha.');
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    const error = new Error('Credenciais invalidas.');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(passwordValue, user.password_user);
  if (!passwordMatches) {
    const error = new Error('Credenciais invalidas.');
    error.statusCode = 401;
    throw error;
  }

  return buildAuthPayload(user);
}

async function getUserProfile(userId) {
  const user = await findUserById(userId);

  if (!user) {
    const error = new Error('Usuario nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
}

async function updateUser(userId, { name, email, password }) {
  assertDatabaseReady();

  const currentUser = await findUserById(userId);
  if (!currentUser) {
    const error = new Error('Usuario nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const passwordValue = String(password || '');
  const updates = [];
  const values = [];

  if (trimmedName) {
    updates.push('name_user = ?');
    values.push(trimmedName);
  }

  if (normalizedEmail && normalizedEmail !== currentUser.email_user) {
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser && Number(existingUser.id) !== Number(userId)) {
      const error = new Error('Ja existe um usuario com este email.');
      error.statusCode = 409;
      throw error;
    }

    updates.push('email_user = ?');
    values.push(normalizedEmail);
  }

  if (passwordValue) {
    if (passwordValue.length < 6) {
      const error = new Error('A senha precisa ter pelo menos 6 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    updates.push('password_user = ?');
    values.push(await bcrypt.hash(passwordValue, 10));
  }

  if (!updates.length) {
    const error = new Error('Informe ao menos um campo para atualizar.');
    error.statusCode = 400;
    throw error;
  }

  values.push(Number(userId));

  const pool = getPool();
  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const updatedUser = await findUserById(userId);
  return sanitizeUser(updatedUser);
}

module.exports = {
  createUser,
  loginUser,
  findUserByEmail,
  findUserById,
  getUserProfile,
  updateUser,
};