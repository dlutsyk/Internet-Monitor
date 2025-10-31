/**
 * Reports Controller
 * Handles report generation and analytics endpoints
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for reports
 * - DIP: Depends on service abstractions
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Depends on MonitorService and AnalyticsService
 */
export default class ReportsController {
  constructor(monitorService, analyticsService, config) {
    this.monitorService = monitorService;
    this.analyticsService = analyticsService;
    this.config = config;
  }

  /**
   * GET /api/metrics/today
   * Returns today's statistics
   */
  async getToday(req, res, next) {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      const measurements = await this.monitorService.getMeasurementsByDateRange(
        startOfToday.toISOString(),
        now.toISOString()
      );

      const summary = this.analyticsService.computeSummary(measurements);

      res.json({
        disconnectionEvents: summary.downtime.events,
        offlineSamples: summary.offlineSamples,
        totalDowntimeMs: summary.downtime.durationMs,
        uptimePercent: summary.uptimePercent,
        date: startOfToday.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports
   * Returns summary report for a date range
   */
  async getReport(req, res, next) {
    try {
      const { from, to } = req.query;
      const fromDate = this.parseDate(from);
      const toDate = this.parseDate(to);

      if (from && !fromDate) {
        return res.status(400).json({ error: 'Invalid from date' });
      }
      if (to && !toDate) {
        return res.status(400).json({ error: 'Invalid to date' });
      }

      const measurements = await this.monitorService.getMeasurementsByDateRange(
        fromDate?.toISOString(),
        toDate?.toISOString()
      );

      const summary = this.analyticsService.computeSummary(measurements);

      res.json({
        summary,
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
        records: measurements.map((m) => m.toJSON()),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Parses date string
   */
  parseDate(value) {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
