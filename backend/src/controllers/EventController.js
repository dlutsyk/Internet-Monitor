/**
 * Event Controller
 * Handles event-related HTTP requests
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for events
 * - DIP: Depends on service abstraction
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Only depends on EventTrackerService
 */
export default class EventController {
  constructor(eventTrackerService) {
    this.eventTrackerService = eventTrackerService;
  }

  /**
   * GET /api/events/recent
   * Returns recent events
   */
  async getRecentEvents(req, res, next) {
    try {
      const limit = this.parseLimit(req.query.limit, 50, 1, 100);
      const events = await this.eventTrackerService.getRecentEvents(limit);

      res.json({
        events: events.map((e) => e.toJSON()),
        count: events.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events
   * Returns events in a date range
   */
  async getEvents(req, res, next) {
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

      const events = await this.eventTrackerService.getEventsByDateRange(fromDate, toDate);

      res.json({
        events: events.map((e) => e.toJSON()),
        count: events.length,
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
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
