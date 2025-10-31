import express from 'express';

/**
 * Creates API routes using controllers from DI container
 *
 * Design Patterns Applied:
 * - Front Controller Pattern: Single entry point for routes
 * - Dependency Injection: Controllers injected from container
 *
 * SOLID Principles:
 * - SRP: Only responsible for route definition
 * - OCP: New routes can be added without modifying existing code
 * - DIP: Depends on controller abstractions
 */
export default function createRoutes(container) {
  const router = express.Router();

  // Get controllers from container
  const healthController = container.get('healthController');
  const metricsController = container.get('metricsController');
  const reportsController = container.get('reportsController');
  const monitorController = container.get('monitorController');
  const archiveController = container.get('archiveController');
  const eventController = container.get('eventController');
  const statisticsController = container.get('statisticsController');

  // Health & Config Routes
  router.get('/health', (req, res) => healthController.getHealth(req, res));
  router.get('/config', (req, res) => healthController.getConfig(req, res));

  // Metrics Routes
  router.get('/metrics/latest', (req, res, next) =>
    metricsController.getLatest(req, res, next)
  );
  router.get('/metrics/recent', (req, res, next) =>
    metricsController.getRecent(req, res, next)
  );
  router.get('/metrics/today', (req, res, next) =>
    reportsController.getToday(req, res, next)
  );

  // Reports Routes
  router.get('/reports', (req, res, next) =>
    reportsController.getReport(req, res, next)
  );

  // Monitor Control Routes
  router.post('/monitor/trigger', (req, res, next) =>
    monitorController.triggerMeasurement(req, res, next)
  );

  // Archive Routes
  router.get('/archives', (req, res, next) =>
    archiveController.listArchives(req, res, next)
  );
  router.post('/archives/trigger', (req, res, next) =>
    archiveController.triggerArchive(req, res, next)
  );

  // Database Routes
  router.post('/database/cleanup', (req, res, next) =>
    archiveController.cleanupDatabase(req, res, next)
  );
  router.get('/database/stats', (req, res, next) =>
    statisticsController.getDatabaseStats(req, res, next)
  );

  // Event Routes
  router.get('/events/recent', (req, res, next) =>
    eventController.getRecentEvents(req, res, next)
  );
  router.get('/events', (req, res, next) =>
    eventController.getEvents(req, res, next)
  );

  // Statistics Routes
  router.get('/statistics/detailed', (req, res, next) =>
    statisticsController.getDetailedStatistics(req, res, next)
  );

  return router;
}
