require('dotenv').config();

const env = {
  port: Number(process.env.PORT || 3001),
  languageDiscountPercent: Number(process.env.LANGUAGE_DISCOUNT_PERCENT || 18),
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'collection-pokemon-tcg-dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mysql: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
};

function isDatabaseConfigured() {
  const { host, user, password, database } = env.mysql;
  return Boolean(host && user && password && database);
}

module.exports = {
  env,
  isDatabaseConfigured,
};