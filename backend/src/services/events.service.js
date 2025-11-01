import * as db from '../db.js';

/**
 * Parse JSON fields from event
 */
function parseEvent(event) {
  if (!event) return null;

  return {
    ...event,
    metadata: event.metadata ? JSON.parse(event.metadata) : null,
  };
}

/**
 * Parse multiple events
 */
function parseEvents(events) {
  return events.map(parseEvent);
}

/**
 * Get recent events
 */
export async function getRecent(limit = 50) {
  const events = await db.getRecentEvents(limit);
  return parseEvents(events);
}

/**
 * Get events by date range
 */
export async function getByDateRange(fromDate, toDate) {
  const events = await db.getEventsByDateRange(fromDate, toDate);
  return parseEvents(events);
}

/**
 * Get event counts by type
 */
export function countByType(events) {
  return events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
}
