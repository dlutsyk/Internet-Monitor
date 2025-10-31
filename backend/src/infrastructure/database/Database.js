import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Database Singleton
 * Manages Prisma Client connection
 *
 * Design Patterns Applied:
 * - Singleton Pattern: Only one database instance exists
 * - Facade Pattern: Simplifies database operations
 *
 * SOLID Principles:
 * - SRP: Only responsible for database connection management
 * - OCP: Can be extended with new operations without modifying existing code
 *
 * GRASP Principles:
 * - Information Expert: Knows about database connection
 * - Creator: Creates and manages the Prisma Client connection
 */
export default class Database {
  static instance = null;

  constructor(dbPath, logger = console) {
    if (Database.instance) {
      return Database.instance;
    }

    this.dbPath = dbPath;
    this.logger = logger;
    this.prisma = null;

    Database.instance = this;
  }

  /**
   * Initializes the Prisma Client connection
   * @returns {Promise<void>}
   */
  async init() {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

    // Create Prisma Client instance
    // Note: DATABASE_URL should be set in .env or environment variables
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${this.dbPath}`,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Connect to database
    await this.prisma.$connect();

    this.logger.info('[database] initialized Prisma database at:', this.dbPath);
  }

  /**
   * Gets the Prisma Client instance
   * @returns {PrismaClient}
   */
  getClient() {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }
    return this.prisma;
  }

  /**
   * Runs VACUUM to reclaim disk space (raw SQL)
   */
  async vacuum() {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }
    await this.prisma.$executeRawUnsafe('VACUUM');
    this.logger.info('[database] VACUUM completed');
  }

  /**
   * Gets database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }

    const measurementCount = await this.prisma.measurement.count();
    const eventCount = await this.prisma.event.count();

    const oldestMeasurement = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const newestMeasurement = await this.prisma.measurement.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return {
      measurementCount,
      eventCount,
      oldestTimestamp: oldestMeasurement?.timestamp ?? null,
      newestTimestamp: newestMeasurement?.timestamp ?? null,
      path: this.dbPath,
    };
  }

  /**
   * Closes the database connection
   */
  async close() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      Database.instance = null;
      this.logger.info('[database] closed database connection');
    }
  }

  /**
   * Gets the singleton instance
   * @returns {Database}
   */
  static getInstance() {
    if (!Database.instance) {
      throw new Error('Database not initialized. Call new Database() first.');
    }
    return Database.instance;
  }
}
