import * as statisticsService from '../services/statistics.service.js';

/**
 * Get database statistics
 */
export async function getDatabaseStats(req, res, next) {
  try {
    const stats = await statisticsService.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * Clean up old database records
 */
export async function cleanupDatabase(req, res, next) {
  try {
    const { config } = req;
    const result = await statisticsService.cleanupDatabase(config.retentionHours);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get detailed statistics
 */
export async function getDetailedStatistics(req, res, next) {
  try {
    const { from, to } = req.query;
    const { config } = req;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required query parameters: from, to',
      });
    }

    const statistics = await statisticsService.getDetailedStatistics(from, to, config);
    res.json(statistics);
  } catch (error) {
    next(error);
  }
}
