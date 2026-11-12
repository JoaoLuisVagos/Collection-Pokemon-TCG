const app = require('./app');
const { env } = require('./config/env');

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`API rodando na porta ${env.port}`);
});

server.on('error', (error) => {
  console.error(`Falha ao iniciar a API: ${error.message}`);
  process.exitCode = 1;
});