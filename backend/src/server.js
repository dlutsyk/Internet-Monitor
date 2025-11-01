import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import config from './config.js';
import * as db from './db.js';
import * as monitor from './monitor.js';
import * as websocket from './websocket.js';
import { createRoutes } from './routes/index.js';

const logger = console;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveFrontendDir = () => path.resolve(__dirname, '../../frontend/dist');

/**
 * Bootstrap application
 */
async function bootstrap() {
  try {
    logger.info('[server] starting application');

    // Initialize database
    await db.initDatabase(config.dbFile, logger);

    // Initialize monitor
    await monitor.initMonitor(config, logger);

    // Create Express app
    const app = express();

    // Middleware
    if (config.httpLogging) {
      app.use(morgan('dev'));
    }

    if (config.corsOrigins) {
      app.use(
        cors({
          origin: config.corsOrigins,
          credentials: true,
        })
      );
    } else {
      app.use(cors());
    }

    app.use(express.json({ limit: '2mb' }));

    // API Routes
    app.use('/api', createRoutes(config));

    // Serve frontend
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

    // Error handling middleware
    app.use((err, req, res, next) => {
      logger.error('[server] error:', err);
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
      });
    });

    // Create HTTP server
    const server = http.createServer(app);

    // Setup WebSocket
    websocket.initWebSocket(server, monitor.events, config, logger);

    // Start monitoring
    await monitor.startMonitoring();

    // Start HTTP server
    await new Promise((resolve, reject) => {
      server.listen(config.port, config.host, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`[server] listening on http://${config.host}:${config.port}`);
          resolve();
        }
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`[server] ${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('[server] HTTP server closed');

        // Stop monitoring
        monitor.stopMonitoring();

        // Close WebSocket
        websocket.closeWebSocket();

        // Close database
        await db.closeDatabase();

        logger.info('[server] shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('[server] forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('[server] uncaught exception:', error);
      // Don't exit - let the monitor continue running
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[server] unhandled rejection at:', promise, 'reason:', reason);
      // Don't exit - let the monitor continue running
    });

    logger.info('[server] application started successfully');
  } catch (error) {
    logger.error('[server] failed to start:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
