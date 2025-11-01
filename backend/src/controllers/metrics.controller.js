import * as metricsService from '../services/metrics.service.js';

/**
 * Get latest measurement
 */
export async function getLatest(req, res, next) {
  try {
    const latest = await metricsService.getLatest();

    if (!latest) {
      return res.status(404).json({ error: 'No measurements found' });
    }

    res.json(latest);
  } catch (error) {
    next(error);
  }
}

/**
 * Get recent measurements
 */
export async function getRecent(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const measurements = await metricsService.getRecent(limit);
    res.json(measurements);
  } catch (error) {
    next(error);
  }
}
