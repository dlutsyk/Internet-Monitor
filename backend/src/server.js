import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import config from './config.js';
import Storage from './storage.js';
import Monitor from './monitor.js';
import createApi from './api.js';
import setupRealtime from './realtime.js';

const logger = console;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveFrontendDir = () => path.resolve(__dirname, '../../frontend/dist');

const bootstrap = async () => {
  const storage = new Storage(config.dataFile, config.retentionHours);
  await storage.init();

  const monitor = new Monitor({
    storage,
    intervalMs: config.intervalMs,
    speedTestMaxTime: config.speedTestMaxTime,
    simulationMode: config.simulationMode,
    logger,
  });

  const app = express();

  if (config.httpLogging) {
    app.use(morgan('dev'));
  }

  if (config.corsOrigins) {
    app.use(
      cors({
        origin: config.corsOrigins,
        credentials: true,
      }),
    );
  } else {
    app.use(cors());
  }

  app.use(express.json({ limit: '2mb' }));

  app.use('/api', createApi({ storage, monitor, config }));

  const frontendDir = resolveFrontendDir();
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDir, 'index.html'));
    });
    logger.info('[server] serving frontend from', frontendDir);
  } else {
    logger.warn('[server] frontend build not found at', frontendDir);
  }

  const server = http.createServer(app);

  setupRealtime(server, { storage, monitor, config, logger });

  await monitor.start();

  server.listen(config.port, config.host, () => {
    logger.info(`[server] listening on http://${config.host}:${config.port}`);
  });

  const gracefulShutdown = async () => {
    logger.info('[server] shutting down...');
    monitor.stop();
    server.close(() => {
      logger.info('[server] closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('[server] forced shutdown');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

bootstrap().catch((error) => {
  logger.error('[server] failed to start', error);
  process.exit(1);
});
