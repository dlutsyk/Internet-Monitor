import { promises as fs } from 'node:fs';
import path from 'node:path';
import Archive from '../models/Archive.js';

/**
 * Archive Service
 * Handles archiving of database data to JSONL files
 *
 * SOLID Principles:
 * - SRP: Only responsible for archiving operations
 * - OCP: Can be extended with new archive formats
 *
 * GRASP Principles:
 * - Information Expert: Knows how to archive and manage files
 * - High Cohesion: All methods related to archiving
 */
export default class ArchiveService {
  constructor(measurementRepository, eventRepository, database, options = {}) {
    this.measurementRepository = measurementRepository;
    this.eventRepository = eventRepository;
    this.database = database;
    this.historyDir = options.historyDir;
    this.logger = options.logger || console;
  }

  /**
   * Initializes the service
   * @returns {Promise<void>}
   */
  async init() {
    await fs.mkdir(this.historyDir, { recursive: true });
    this.logger.info('[ArchiveService] initialized with history dir:', this.historyDir);
  }

  /**
   * Archives measurements to JSONL file
   * @param {Date|string} beforeDate - Archive data before this date
   * @returns {Promise<Object>}
   */
  async archiveMeasurements(beforeDate = null) {
    try {
      // Get measurements to archive
      const measurements = await this.measurementRepository.findByDateRange(null, beforeDate);

      if (measurements.length === 0) {
        this.logger.info('[ArchiveService] no measurements to archive');
        return { archived: false, archivePath: null, recordCount: 0 };
      }

      // Generate archive filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const archiveFilename = `measurements_${dateStr}_${timeStr}.jsonl`;
      const archivePath = path.join(this.historyDir, archiveFilename);

      // Write to JSONL file
      const jsonlData = measurements.map((m) => JSON.stringify(m.toJSON())).join('\n');
      await fs.writeFile(archivePath, jsonlData + '\n');

      this.logger.info(`[ArchiveService] archived ${measurements.length} measurements to:`, archivePath);

      return { archived: true, archivePath, recordCount: measurements.length };
    } catch (error) {
      this.logger.error('[ArchiveService] failed to archive measurements:', error);
      throw error;
    }
  }

  /**
   * Archives events to JSONL file
   * @param {Date|string} beforeDate - Archive data before this date
   * @returns {Promise<Object>}
   */
  async archiveEvents(beforeDate = null) {
    try {
      // Get events to archive
      const events = await this.eventRepository.findByDateRange(null, beforeDate);

      if (events.length === 0) {
        this.logger.info('[ArchiveService] no events to archive');
        return { archived: false, archivePath: null, recordCount: 0 };
      }

      // Generate archive filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const archiveFilename = `events_${dateStr}_${timeStr}.jsonl`;
      const archivePath = path.join(this.historyDir, archiveFilename);

      // Write to JSONL file
      const jsonlData = events.map((e) => JSON.stringify(e.toJSON())).join('\n');
      await fs.writeFile(archivePath, jsonlData + '\n');

      this.logger.info(`[ArchiveService] archived ${events.length} events to:`, archivePath);

      return { archived: true, archivePath, recordCount: events.length };
    } catch (error) {
      this.logger.error('[ArchiveService] failed to archive events:', error);
      throw error;
    }
  }

  /**
   * Lists all archive files
   * @returns {Promise<Array<Archive>>}
   */
  async listArchives() {
    try {
      const files = await fs.readdir(this.historyDir);
      const archives = [];

      for (const filename of files) {
        if (
          (filename.startsWith('measurements_') || filename.startsWith('events_')) &&
          filename.endsWith('.jsonl')
        ) {
          const filePath = path.join(this.historyDir, filename);
          const stats = await fs.stat(filePath);
          const archive = Archive.fromFileStats(filename, filePath, stats.mtime, stats.size);
          archives.push(archive);
        }
      }

      // Sort by date, newest first
      return archives.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      this.logger.error('[ArchiveService] failed to list archives:', error);
      return [];
    }
  }

  /**
   * Cleans up database by archiving and deleting old data
   * @param {number} retentionMs - Retention period in milliseconds
   * @returns {Promise<Object>}
   */
  async cleanupDatabase(retentionMs) {
    try {
      const beforeDate = new Date(Date.now() - retentionMs);

      this.logger.info(
        `[ArchiveService] starting database cleanup (retention: ${retentionMs / (24 * 60 * 60 * 1000)} days)`
      );

      // Archive old data first
      const measurementsResult = await this.archiveMeasurements(beforeDate);
      const eventsResult = await this.archiveEvents(beforeDate);

      // Delete from database
      const measurementsDeleted = await this.measurementRepository.deleteOlderThan(beforeDate);
      const eventsDeleted = await this.eventRepository.deleteOlderThan(beforeDate);

      // Run VACUUM to reclaim space
      this.database.vacuum();

      this.logger.info('[ArchiveService] database cleanup completed', {
        measurementsArchived: measurementsResult.recordCount,
        eventsArchived: eventsResult.recordCount,
        measurementsDeleted,
        eventsDeleted,
      });

      return {
        measurementsArchived: measurementsResult.recordCount,
        eventsArchived: eventsResult.recordCount,
        measurementsDeleted,
        eventsDeleted,
        measurementsArchivePath: measurementsResult.archivePath,
        eventsArchivePath: eventsResult.archivePath,
      };
    } catch (error) {
      this.logger.error('[ArchiveService] failed to cleanup database:', error);
      throw error;
    }
  }

  /**
   * Deletes old archive files
   * @param {number} maxAgeDays - Maximum age in days
   * @returns {Promise<number>} Number of deleted archives
   */
  async cleanOldArchives(maxAgeDays) {
    try {
      const archives = await this.listArchives();
      let deletedCount = 0;

      for (const archive of archives) {
        if (archive.isOlderThan(maxAgeDays)) {
          await fs.unlink(archive.path);
          this.logger.info('[ArchiveService] deleted old archive:', archive.filename);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.info(`[ArchiveService] cleaned up ${deletedCount} old archives`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('[ArchiveService] failed to clean old archives:', error);
      throw error;
    }
  }
}
