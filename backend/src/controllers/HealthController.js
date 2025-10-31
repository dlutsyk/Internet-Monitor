/**
 * Health Controller
 * Handles health check and configuration endpoints
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for health checks
 * - DIP: Depends on configuration abstraction
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests
 * - Low Coupling: Minimal dependencies
 */
export default class HealthController {
  constructor(config) {
    this.config = config;
  }

  /**
   * GET /api/health
   * Returns health status of the application
   */
  async getHealth(req, res) {
    res.json({
      status: 'ok',
      simulation: this.config.simulationMode,
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * GET /api/config
   * Returns public configuration
   */
  async getConfig(req, res) {
    res.json({
      intervalMs: this.config.intervalMs,
      speedDropThresholdMbps: this.config.speedDropThresholdMbps,
      speedDropPercent: this.config.speedDropPercent,
      simulationMode: this.config.simulationMode,
      wsPath: this.config.wsPath,
    });
  }
}
