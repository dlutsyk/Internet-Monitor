/**
 * Statistics Controller
 * Handles detailed statistics endpoints
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for statistics
 * - DIP: Depends on service abstractions
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Depends on multiple services but through interfaces
 */
export default class StatisticsController {
  constructor(monitorService, eventTrackerService, analyticsService, database) {
    this.monitorService = monitorService;
    this.eventTrackerService = eventTrackerService;
    this.analyticsService = analyticsService;
    this.database = database;
  }

  /**
   * GET /api/statistics/detailed
   * Returns detailed statistics for a time range
   */
  async getDetailedStatistics(req, res, next) {
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

      // Default to last 24 hours if no range specified
      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const finalFrom = fromDate ?? defaultFrom;
      const finalTo = toDate ?? now;

      // Get measurements
      const measurements = await this.monitorService.getMeasurementsByDateRange(
        finalFrom.toISOString(),
        finalTo.toISOString()
      );

      // Compute summary
      const summary = this.analyticsService.computeSummary(measurements);

      // Get events
      const events = await this.eventTrackerService.getEventsByDateRange(finalFrom, finalTo);
      const eventsByType = this.eventTrackerService.groupEventsByType(events);

      // Compute uptime periods
      const uptimePeriods = this.analyticsService.computeUptimePeriods(measurements);

      res.json({
        period: {
          from: finalFrom.toISOString(),
          to: finalTo.toISOString(),
        },
        summary,
        events: Object.keys(eventsByType).reduce((acc, type) => {
          acc[type] = eventsByType[type].map((e) => e.toJSON());
          return acc;
        }, {}),
        uptimePeriods,
        dbStats: this.database.getStats(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/database/stats
   * Returns database statistics
   */
  async getDatabaseStats(req, res, next) {
    try {
      const stats = this.database.getStats();
      res.json(stats);
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
