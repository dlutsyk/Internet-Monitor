import IMeasurementRepository from '../interfaces/IMeasurementRepository.js';
import Measurement from '../../models/Measurement.js';

/**
 * Prisma-based Measurement Repository Implementation
 *
 * Design Patterns Applied:
 * - Repository Pattern: Concrete implementation for Prisma
 * - Adapter Pattern: Adapts Prisma Client to IMeasurementRepository interface
 *
 * SOLID Principles:
 * - SRP: Only responsible for measurement data access
 * - OCP: Can be extended without modifying existing code
 * - LSP: Can be substituted anywhere IMeasurementRepository is expected
 * - DIP: Depends on Database abstraction
 *
 * GRASP Principles:
 * - Information Expert: Has all the info needed to manage measurements
 * - Low Coupling: Depends only on Database and Measurement model
 * - High Cohesion: All methods related to measurement persistence
 */
export default class MeasurementRepository extends IMeasurementRepository {
  constructor(database) {
    super();
    this.database = database;
    this.cache = [];
    this.cacheSize = 200;
  }

  /**
   * Gets the Prisma Client instance
   * @returns {PrismaClient}
   */
  get prisma() {
    return this.database.getClient();
  }

  /**
   * Initializes the repository and loads cache
   * @returns {Promise<void>}
   */
  async init() {
    this.cache = await this.findRecent(this.cacheSize);
  }

  /**
   * Inserts a new measurement
   * @param {Measurement} measurement
   * @returns {Promise<Measurement>}
   */
  async insert(measurement) {
    if (!(measurement instanceof Measurement)) {
      throw new Error('Must provide a Measurement instance');
    }

    const created = await this.prisma.measurement.create({
      data: {
        timestamp: measurement.timestamp,
        status: measurement.status,
        downloadMbps: measurement.downloadMbps,
        uploadMbps: measurement.uploadMbps,
        latencyMs: measurement.latencyMs,
        jitterMs: measurement.jitterMs,
        packetLoss: measurement.packetLoss,
        durationSinceLastMs: measurement.durationSinceLastMs,
        estimatedDowntimeMs: measurement.estimatedDowntimeMs,
        error: measurement.error ? JSON.stringify(measurement.error) : null,
        meta: measurement.meta ? JSON.stringify(measurement.meta) : null,
        server: measurement.server ? JSON.stringify(measurement.server) : null,
        client: measurement.client ? JSON.stringify(measurement.client) : null,
      },
    });

    const insertedMeasurement = new Measurement({
      ...measurement.toJSON(),
      id: created.id,
    });

    // Update cache
    this.cache.push(insertedMeasurement);
    if (this.cache.length > this.cacheSize) {
      this.cache.shift();
    }

    return insertedMeasurement;
  }

  /**
   * Finds a measurement by ID
   * @param {number} id
   * @returns {Promise<Measurement|null>}
   */
  async findById(id) {
    const row = await this.prisma.measurement.findUnique({
      where: { id },
    });

    return row ? Measurement.fromDatabaseRow(row) : null;
  }

  /**
   * Finds the most recent N measurements
   * @param {number} limit
   * @returns {Promise<Array<Measurement>>}
   */
  async findRecent(limit = 50) {
    if (limit <= 0) {
      return [];
    }

    // Try to use cache if available and sufficient
    if (this.cache.length >= limit) {
      return this.cache.slice(-limit);
    }

    const rows = await this.prisma.measurement.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows.reverse().map((row) => Measurement.fromDatabaseRow(row));
  }

  /**
   * Finds measurements within a date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Measurement>>}
   */
  async findByDateRange(fromDate, toDate) {
    const where = {};

    if (fromDate) {
      where.timestamp = {
        ...where.timestamp,
        gte: typeof fromDate === 'string' ? fromDate : fromDate.toISOString(),
      };
    }

    if (toDate) {
      where.timestamp = {
        ...where.timestamp,
        lte: typeof toDate === 'string' ? toDate : toDate.toISOString(),
      };
    }

    const rows = await this.prisma.measurement.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return rows.map((row) => Measurement.fromDatabaseRow(row));
  }

  /**
   * Finds the latest measurement
   * @returns {Promise<Measurement|null>}
   */
  async findLatest() {
    // Try cache first
    if (this.cache.length > 0) {
      return this.cache[this.cache.length - 1];
    }

    const row = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    return row ? Measurement.fromDatabaseRow(row) : null;
  }

  /**
   * Deletes measurements older than the specified date
   * @param {Date|string} beforeDate
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteOlderThan(beforeDate) {
    const dateStr = typeof beforeDate === 'string' ? beforeDate : beforeDate.toISOString();
    const result = await this.prisma.measurement.deleteMany({
      where: {
        timestamp: { lt: dateStr },
      },
    });

    // Clear cache to force reload
    this.cache = [];

    return result.count;
  }

  /**
   * Counts total measurements
   * @returns {Promise<number>}
   */
  async count() {
    return await this.prisma.measurement.count();
  }

  /**
   * Gets the date range of measurements
   * @returns {Promise<{oldest: string|null, newest: string|null}>}
   */
  async getDateRange() {
    const oldest = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const newest = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return {
      oldest: oldest?.timestamp ?? null,
      newest: newest?.timestamp ?? null,
    };
  }

  /**
   * Gets the last recorded state (for event detection)
   * @returns {Promise<{status: string, downloadMbps: number|null, timestamp: string}|null>}
   */
  async getLastState() {
    const result = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'desc' },
      select: {
        status: true,
        downloadMbps: true,
        timestamp: true,
      },
    });

    return result || null;
  }
}
