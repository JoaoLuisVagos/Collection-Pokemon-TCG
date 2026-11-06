const mysql = require('mysql2/promise');
const mysqlBase = require('mysql2');
const { env, isDatabaseConfigured } = require('./env');

let pool;

function addProxyCompatibleQuery(connection) {
  const execute = connection.execute.bind(connection);

  connection.query = (sql, values) => (
    values === undefined
      ? execute(sql)
      : execute(mysqlBase.format(sql, values))
  );

  return connection;
}

function getPool() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      ...(env.mysql.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    addProxyCompatibleQuery(pool);

    const getConnection = pool.getConnection.bind(pool);
    pool.getConnection = async () => (
      addProxyCompatibleQuery(await getConnection())
    );
  }

  return pool;
}

module.exports = {
  getPool,
};