const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { findUserById } = require('./users.service');

function extractBearerToken(header) {
  if (!header) {
    return null;
  }

  const [type, token] = String(header).split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function authenticateRequest(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'Token nao informado.' });
    }

    const payload = jwt.verify(token, env.auth.jwtSecret);
    const userId = Number(payload.sub);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(401).json({ error: 'Token invalido.' });
    }

    req.authenticatedUser = {
      id: user.id,
      email: user.email_user,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido.' });
  }
}

module.exports = {
  authenticateRequest,
};