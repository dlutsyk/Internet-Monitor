import IEventRepository from '../interfaces/IEventRepository.js';
import Event from '../../models/Event.js';

/**
 * Prisma-based Event Repository Implementation
 *
 * Design Patterns Applied:
 * - Repository Pattern: Concrete implementation for Prisma
 * - Adapter Pattern: Adapts Prisma Client to IEventRepository interface
 *
 * SOLID Principles:
 * - SRP: Only responsible for event data access
 * - OCP: Can be extended without modifying existing code
 * - LSP: Can be substituted anywhere IEventRepository is expected
 * - DIP: Depends on Database abstraction
 *
 * GRASP Principles:
 * - Information Expert: Has all the info needed to manage events
 * - Low Coupling: Depends only on Database and Event model
 * - High Cohesion: All methods related to event persistence
 */
export default class EventRepository extends IEventRepository {
  constructor(database) {
    super();
    this.database = database;
    this.cache = [];
    this.cacheSize = 1000;
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
   * Inserts a new event
   * @param {Event} event
   * @returns {Promise<Event>}
   */
  async insert(event) {
    if (!(event instanceof Event)) {
      throw new Error('Must provide an Event instance');
    }

    await this.prisma.event.create({
      data: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    });

    // Update cache (add to beginning for reverse chronological order)
    this.cache.unshift(event);
    if (this.cache.length > this.cacheSize) {
      this.cache.pop();
    }

    return event;
  }

  /**
   * Finds an event by ID
   * @param {string} id
   * @returns {Promise<Event|null>}
   */
  async findById(id) {
    const row = await this.prisma.event.findUnique({
      where: { id },
    });

    return row ? Event.fromDatabaseRow(row) : null;
  }

  /**
   * Finds the most recent N events
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async findRecent(limit = 50) {
    if (limit <= 0) {
      return [];
    }

    // Try to use cache if available and sufficient
    if (this.cache.length >= limit) {
      return this.cache.slice(0, limit);
    }

    const rows = await this.prisma.event.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows.map((row) => Event.fromDatabaseRow(row));
  }

  /**
   * Finds events within a date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Event>>}
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

    const rows = await this.prisma.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return rows.map((row) => Event.fromDatabaseRow(row));
  }

  /**
   * Finds events by type
   * @param {string} type
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async findByType(type, limit = 50) {
    const rows = await this.prisma.event.findMany({
      where: { type },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows.map((row) => Event.fromDatabaseRow(row));
  }

  /**
   * Deletes events older than the specified date
   * @param {Date|string} beforeDate
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteOlderThan(beforeDate) {
    const dateStr = typeof beforeDate === 'string' ? beforeDate : beforeDate.toISOString();
    const result = await this.prisma.event.deleteMany({
      where: {
        timestamp: { lt: dateStr },
      },
    });

    // Clear cache to force reload
    this.cache = [];

    return result.count;
  }

  /**
   * Counts total events
   * @returns {Promise<number>}
   */
  async count() {
    return await this.prisma.event.count();
  }

  /**
   * Gets the date range of events
   * @returns {Promise<{oldest: string|null, newest: string|null}>}
   */
  async getDateRange() {
    const oldest = await this.prisma.event.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const newest = await this.prisma.event.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return {
      oldest: oldest?.timestamp ?? null,
      newest: newest?.timestamp ?? null,
    };
  }
}
