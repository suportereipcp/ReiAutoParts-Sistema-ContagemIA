import pino from 'pino';
import { config } from '../config.js';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: config.logs.level,
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  base: { app: 'contagem-edge' },
});
