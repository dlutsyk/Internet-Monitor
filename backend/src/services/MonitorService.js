import EventEmitter from 'node:events';
import Measurement from '../models/Measurement.js';

/**
 * Monitor Service
 * Handles network monitoring business logic
 *
 * Design Patterns Applied:
 * - Observer Pattern: Extends EventEmitter to notify subscribers
 * - Strategy Pattern: Uses injected monitoring strategy
 *
 * SOLID Principles:
 * - SRP: Only responsible for monitoring orchestration
 * - OCP: Can work with any monitoring strategy
 * - DIP: Depends on abstractions (IMonitoringStrategy, IMeasurementRepository)
 *
 * GRASP Principles:
 * - Controller: Coordinates monitoring operations
 * - Low Coupling: Depends on interfaces
 * - High Cohesion: All methods related to monitoring
 */
export default class MonitorService extends EventEmitter {
  constructor(measurementRepository, monitoringStrategy, options = {}) {
    super();
    this.measurementRepository = measurementRepository;
    this.monitoringStrategy = monitoringStrategy;
    this.intervalMs = options.intervalMs || 60000;
    this.logger = options.logger || console;

    this.timer = null;
    this.running = false;
    this.inFlight = false;
    this.lastRunAt = null;
  }

  /**
   * Starts the monitoring loop
   * @returns {Promise<void>}
   */
  async start() {
    if (this.running) {
      this.logger.warn('[MonitorService] already running');
      return;
    }

    this.running = true;
    this.logger.info('[MonitorService] starting monitoring');

    // Perform initial measurement
    try {
      await this.performMeasurement({ force: true });
    } catch (error) {
      this.logger.error('[MonitorService] initial measurement failed:', error);
    }

    // Schedule periodic measurements
    this.timer = setInterval(() => {
      this.performMeasurement().catch((error) => {
        this.logger.error('[MonitorService] measurement failed:', error);
      });
    }, this.intervalMs);

    this.logger.info(`[MonitorService] monitoring started (interval: ${this.intervalMs}ms)`);
  }

  /**
   * Stops the monitoring loop
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.logger.info('[MonitorService] monitoring stopped');
  }

  /**
   * Checks if monitoring is currently running
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }

  /**
   * Performs a single measurement
   * @param {Object} options
   * @returns {Promise<Measurement|null>}
   */
  async performMeasurement({ force = false } = {}) {
    if (this.inFlight) {
      this.logger.debug('[MonitorService] measurement already in flight');
      return null;
    }

    if (!this.running && !force) {
      this.logger.debug('[MonitorService] not running, skipping measurement');
      return null;
    }

    this.inFlight = true;
    const startedAt = Date.now();
    const durationSinceLast = this.lastRunAt ? startedAt - this.lastRunAt : this.intervalMs;

    try {
      // Perform measurement using strategy
      const rawData = await this.monitoringStrategy.measure();

      // Create measurement model
      const measurement = new Measurement({
        timestamp: new Date(startedAt).toISOString(),
        status: rawData.status,
        downloadMbps: rawData.downloadMbps,
        uploadMbps: rawData.uploadMbps,
        latencyMs: rawData.latencyMs,
        jitterMs: rawData.jitterMs,
        packetLoss: rawData.packetLoss,
        durationSinceLastMs: durationSinceLast,
        estimatedDowntimeMs: rawData.status !== 'online' ? durationSinceLast : null,
        error: rawData.error,
        meta: {
          ...(rawData.meta || {}),
          intervalMs: this.intervalMs,
        },
        server: rawData.server,
        client: rawData.client,
      });

      // Skip storing unreliable results
      const isUnreliable =
        measurement.isOnline() &&
        measurement.meta?.note &&
        (measurement.meta.note.includes('unreliable') || measurement.meta.note.includes('error'));

      if (!isUnreliable) {
        // Store measurement
        const storedMeasurement = await this.measurementRepository.insert(measurement);

        // Emit event for subscribers
        this.emit('measurement', storedMeasurement);

        this.lastRunAt = startedAt;
        return storedMeasurement;
      } else {
        this.logger.info('[MonitorService] skipping unreliable measurement');
        this.lastRunAt = startedAt;
        return null;
      }
    } catch (error) {
      this.logger.error('[MonitorService] measurement failed:', error);
      throw error;
    } finally {
      this.inFlight = false;
    }
  }

  /**
   * Triggers a single measurement immediately
   * @returns {Promise<Measurement>}
   */
  async triggerMeasurement() {
    const measurement = await this.performMeasurement({ force: true });

    if (measurement) {
      return measurement;
    }

    // Wait for next scheduled measurement
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('measurement', listener);
        reject(new Error('Timed out waiting for measurement'));
      }, this.intervalMs + 10000);

      const listener = (data) => {
        clearTimeout(timeout);
        this.off('measurement', listener);
        resolve(data);
      };

      this.once('measurement', listener);
    });
  }

  /**
   * Gets recent measurements
   * @param {number} limit
   * @returns {Promise<Array<Measurement>>}
   */
  async getRecentMeasurements(limit = 50) {
    return this.measurementRepository.findRecent(limit);
  }

  /**
   * Gets the latest measurement
   * @returns {Promise<Measurement|null>}
   */
  async getLatestMeasurement() {
    return this.measurementRepository.findLatest();
  }

  /**
   * Gets measurements in a date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Measurement>>}
   */
  async getMeasurementsByDateRange(fromDate, toDate) {
    return this.measurementRepository.findByDateRange(fromDate, toDate);
  }

  /**
   * Gets monitoring statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const count = await this.measurementRepository.count();
    const dateRange = await this.measurementRepository.getDateRange();

    return {
      totalMeasurements: count,
      oldestMeasurement: dateRange.oldest,
      newestMeasurement: dateRange.newest,
      isRunning: this.isRunning(),
      intervalMs: this.intervalMs,
    };
  }
}
