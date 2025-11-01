import * as db from '../db.js';

/**
 * Parse JSON fields from measurement
 */
function parseMeasurement(measurement) {
  if (!measurement) return null;

  return {
    ...measurement,
    error: measurement.error ? JSON.parse(measurement.error) : null,
    meta: measurement.meta ? JSON.parse(measurement.meta) : null,
    server: measurement.server ? JSON.parse(measurement.server) : null,
    client: measurement.client ? JSON.parse(measurement.client) : null,
  };
}

/**
 * Parse multiple measurements
 */
function parseMeasurements(measurements) {
  return measurements.map(parseMeasurement);
}

/**
 * Get latest measurement
 */
export async function getLatest() {
  const measurement = await db.getLatestMeasurement();
  return parseMeasurement(measurement);
}

/**
 * Get recent measurements
 */
export async function getRecent(limit = 50) {
  const measurements = await db.getRecentMeasurements(limit);
  return parseMeasurements(measurements);
}

/**
 * Get measurements by date range
 */
export async function getByDateRange(fromDate, toDate) {
  const measurements = await db.getMeasurementsByDateRange(fromDate, toDate);
  return parseMeasurements(measurements);
}
