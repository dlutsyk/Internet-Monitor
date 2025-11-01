import * as db from '../db.js';
import * as metricsService from './metrics.service.js';
import * as eventsService from './events.service.js';
import * as analytics from '../analytics.js';

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  return await db.getDatabaseStats();
}

/**
 * Clean up old data from database
 */
export async function cleanupDatabase(retentionHours) {
  const retentionMs = retentionHours * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - retentionMs).toISOString();

  const deletedMeasurements = await db.deleteMeasurementsOlderThan(cutoffDate);
  const deletedEvents = await db.deleteEventsOlderThan(cutoffDate);

  await db.vacuum();

  return {
    deletedMeasurements,
    deletedEvents,
    cutoffDate,
  };
}

/**
 * Get detailed statistics for a period
 */
export async function getDetailedStatistics(fromDate, toDate, config) {
  const measurements = await metricsService.getByDateRange(fromDate, toDate);
  const events = await eventsService.getByDateRange(fromDate, toDate);
  const dbStats = await getDatabaseStats();

  const summary = analytics.computeSummary(measurements, config);
  const eventsByType = eventsService.countByType(events);

  return {
    period: { from: fromDate, to: toDate },
    summary,
    events: {
      total: events.length,
      byType: eventsByType,
    },
    database: dbStats,
  };
}
