import * as monitor from '../monitor.js';

/**
 * Get health status
 */
export function getHealth(req, res) {
  const status = monitor.getStatus();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    monitoring: {
      running: status.isRunning,
      lastRun: status.lastRunAt ? new Date(status.lastRunAt).toISOString() : null,
    },
  });
}

/**
 * Get configuration
 */
export function getConfig(req, res) {
  const { config } = req;
  res.json({
    intervalMs: config.intervalMs,
    retentionHours: config.retentionHours,
    speedDropThresholdMbps: config.speedDropThresholdMbps,
    speedDropPercent: config.speedDropPercent,
    simulationMode: config.simulationMode,
  });
}
