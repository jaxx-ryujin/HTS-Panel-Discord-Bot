const pino = require('pino');

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

const redactOptions = {
  paths: [
    'token',
    '*.token',
    'WISP_API_TOKEN',
    'DISCORD_TOKEN',
    'authorization',
    'headers.authorization',
    'headers.Authorization',
    'password',
    'secret'
  ],
  censor: '[MASQUÉ]'
};

const transport = !isProduction
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  : undefined;

const logger = pino({
  level: logLevel,
  redact: redactOptions,
  transport
});

module.exports = logger;
