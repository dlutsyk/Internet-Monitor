/**
 * Archive Controller
 * Handles archive-related HTTP requests
 *
 * SOLID Principles:
 * - SRP: Only handles HTTP request/response for archives
 * - DIP: Depends on service abstraction
 *
 * GRASP Principles:
 * - Controller: Coordinates HTTP requests and service calls
 * - Low Coupling: Only depends on ArchiveService
 */
export default class ArchiveController {
  constructor(archiveService) {
    this.archiveService = archiveService;
  }

  /**
   * GET /api/archives
   * Lists all archive files
   */
  async listArchives(req, res, next) {
    try {
      const archives = await this.archiveService.listArchives();
      res.json({
        archives: archives.map((a) => a.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/archives/trigger
   * Manually triggers archiving
   */
  async triggerArchive(req, res, next) {
    try {
      const measurementsResult = await this.archiveService.archiveMeasurements();
      const eventsResult = await this.archiveService.archiveEvents();

      res.status(202).json({
        measurements: measurementsResult,
        events: eventsResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/database/cleanup
   * Cleans up old database records
   */
  async cleanupDatabase(req, res, next) {
    try {
      const retentionHours = req.body.retentionHours ?? 24;
      const retentionMs = retentionHours * 60 * 60 * 1000;

      const result = await this.archiveService.cleanupDatabase(retentionMs);

      res.status(202).json({
        ...result,
        retentionHours,
        message: 'Database cleanup completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
