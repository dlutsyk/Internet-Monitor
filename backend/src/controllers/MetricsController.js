/**
 * Metrics Controller
 * Handles measurement-related HTTP requests
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for metrics
 * - DIP: Depends on service abstraction
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Only depends on MonitorService
 */
export default class MetricsController {
  constructor(monitorService) {
    this.monitorService = monitorService;
  }

  /**
   * GET /api/metrics/latest
   * Returns the latest measurement
   */
  async getLatest(req, res, next) {
    try {
      const latest = await this.monitorService.getLatestMeasurement();
      res.json({ data: latest ? latest.toJSON() : null });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/metrics/recent
   * Returns recent measurements
   */
  async getRecent(req, res, next) {
    try {
      const limit = this.parseLimit(req.query.limit, 50, 1, 500);
      const measurements = await this.monitorService.getRecentMeasurements(limit);

      res.json({
        items: measurements.map((m) => m.toJSON()),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Parses and validates limit parameter
   */
  parseLimit(value, defaultValue, min, max) {
    const parsed = Number.parseInt(value ?? defaultValue, 10);
    if (Number.isNaN(parsed)) {
      return defaultValue;
    }
    return Math.min(Math.max(parsed, min), max);
  }
}
