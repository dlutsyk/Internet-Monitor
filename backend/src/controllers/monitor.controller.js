import * as monitor from '../monitor.js';

/**
 * Trigger manual measurement
 */
export async function triggerMeasurement(req, res, next) {
  try {
    const measurement = await monitor.performMeasurement({ force: true });

    if (!measurement) {
      return res.status(500).json({
        error: 'Failed to perform measurement',
      });
    }

    // Parse JSON fields
    const result = {
      ...measurement,
      error: measurement.error ? JSON.parse(measurement.error) : null,
      meta: measurement.meta ? JSON.parse(measurement.meta) : null,
      server: measurement.server ? JSON.parse(measurement.server) : null,
      client: measurement.client ? JSON.parse(measurement.client) : null,
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
}
