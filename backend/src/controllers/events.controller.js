import * as eventsService from '../services/events.service.js';

/**
 * Get recent events
 */
export async function getRecent(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await eventsService.getRecent(limit);
    res.json(events);
  } catch (error) {
    next(error);
  }
}

/**
 * Get events by date range
 */
export async function getByDateRange(req, res, next) {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required query parameters: from, to',
      });
    }

    const events = await eventsService.getByDateRange(from, to);
    res.json(events);
  } catch (error) {
    next(error);
  }
}
