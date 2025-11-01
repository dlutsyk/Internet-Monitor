import * as metricsService from './metrics.service.js';
import * as analytics from '../analytics.js';

/**
 * Generate report for date range
 */
export async function generateReport(fromDate, toDate, config) {
  const measurements = await metricsService.getByDateRange(fromDate, toDate);
  const summary = analytics.computeSummary(measurements, config);

  return {
    from: fromDate,
    to: toDate,
    summary,
    measurements,
  };
}

/**
 * Generate today's report
 */
export async function generateTodayReport(config) {
  const { from, to } = analytics.getTodayDateRange();
  return generateReport(from, to, config);
}
