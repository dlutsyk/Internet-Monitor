import express from 'express';
import healthRoutes from './health.routes.js';
import metricsRoutes from './metrics.routes.js';
import reportsRoutes from './reports.routes.js';
import monitorRoutes from './monitor.routes.js';
import eventsRoutes from './events.routes.js';
import statisticsRoutes from './statistics.routes.js';

/**
 * Configure middleware to attach config to request
 */
function configMiddleware(config) {
  return (req, res, next) => {
    req.config = config;
    next();
  };
}

/**
 * Create and configure all API routes
 */
export function createRoutes(config) {
  const router = express.Router();

  // Attach config to all requests
  router.use(configMiddleware(config));

  // Mount route modules
  router.use('/', healthRoutes);
  router.use('/metrics', metricsRoutes);
  router.use('/reports', reportsRoutes);
  router.use('/monitor', monitorRoutes);
  router.use('/events', eventsRoutes);
  router.use('/statistics', statisticsRoutes);

  return router;
}
