/**
 * Monitor Controller
 * Handles monitoring control endpoints
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for monitoring control
 * - DIP: Depends on service abstraction
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Only depends on MonitorService
 */
export default class MonitorController {
  constructor(monitorService) {
    this.monitorService = monitorService;
  }

  /**
   * POST /api/monitor/trigger
   * Triggers a manual measurement
   */
  async triggerMeasurement(req, res, next) {
    try {
      const measurement = await this.monitorService.triggerMeasurement();
      res.status(202).json({ data: measurement ? measurement.toJSON() : null });
    } catch (error) {
      next(error);
    }
  }
}
