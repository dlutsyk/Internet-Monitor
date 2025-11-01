import * as reportsService from '../services/reports.service.js';

/**
 * Get today's report
 */
export async function getToday(req, res, next) {
  try {
    const { config } = req;
    const report = await reportsService.generateTodayReport(config);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

/**
 * Get report for date range
 */
export async function getReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const { config } = req;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required query parameters: from, to',
      });
    }

    const report = await reportsService.generateReport(from, to, config);
    res.json(report);
  } catch (error) {
    next(error);
  }
}
