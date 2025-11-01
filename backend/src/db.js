import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { promises as fs } from 'node:fs';

let prisma = null;
let logger = console;

/**
 * Initialize database connection
 */
export async function initDatabase(dbPath, log = console) {
  logger = log;

  // Ensure directory exists
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  // Create Prisma Client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  await prisma.$connect();
  logger.info('[db] connected to database:', dbPath);

  return prisma;
}

/**
 * Get Prisma client instance
 */
export function getDb() {
  if (!prisma) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return prisma;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('[db] disconnected from database');
  }
}

// Measurement queries
export async function insertMeasurement(data) {
  return await prisma.measurement.create({
    data: {
      timestamp: data.timestamp,
      status: data.status,
      downloadMbps: data.downloadMbps,
      uploadMbps: data.uploadMbps,
      latencyMs: data.latencyMs,
      jitterMs: data.jitterMs,
      packetLoss: data.packetLoss,
      durationSinceLastMs: data.durationSinceLastMs,
      estimatedDowntimeMs: data.estimatedDowntimeMs,
      error: data.error ? JSON.stringify(data.error) : null,
      meta: data.meta ? JSON.stringify(data.meta) : null,
      server: data.server ? JSON.stringify(data.server) : null,
      client: data.client ? JSON.stringify(data.client) : null,
    },
  });
}

export async function getLatestMeasurement() {
  return await prisma.measurement.findFirst({
    orderBy: { timestamp: 'desc' },
  });
}

export async function getRecentMeasurements(limit = 50) {
  const rows = await prisma.measurement.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  return rows.reverse();
}

export async function getMeasurementsByDateRange(fromDate, toDate) {
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

  return await prisma.measurement.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });
}

export async function deleteMeasurementsOlderThan(beforeDate) {
  const dateStr = typeof beforeDate === 'string' ? beforeDate : beforeDate.toISOString();
  const result = await prisma.measurement.deleteMany({
    where: {
      timestamp: { lt: dateStr },
    },
  });
  return result.count;
}

export async function getMeasurementCount() {
  return await prisma.measurement.count();
}

// Event queries
export async function insertEvent(data) {
  return await prisma.event.create({
    data: {
      id: data.id,
      type: data.type,
      timestamp: data.timestamp,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

export async function getRecentEvents(limit = 50) {
  const rows = await prisma.event.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  return rows.reverse();
}

export async function getEventsByDateRange(fromDate, toDate) {
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

  return await prisma.event.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });
}

export async function deleteEventsOlderThan(beforeDate) {
  const dateStr = typeof beforeDate === 'string' ? beforeDate : beforeDate.toISOString();
  const result = await prisma.event.deleteMany({
    where: {
      timestamp: { lt: dateStr },
    },
  });
  return result.count;
}

export async function getEventCount() {
  return await prisma.event.count();
}

// Database maintenance
export async function vacuum() {
  await prisma.$executeRawUnsafe('VACUUM');
  logger.info('[db] vacuum completed');
}

export async function getDatabaseStats() {
  const measurementCount = await getMeasurementCount();
  const eventCount = await getEventCount();

  const oldestMeasurement = await prisma.measurement.findFirst({
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true },
  });

  const newestMeasurement = await prisma.measurement.findFirst({
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });

  return {
    measurementCount,
    eventCount,
    oldestTimestamp: oldestMeasurement?.timestamp ?? null,
    newestTimestamp: newestMeasurement?.timestamp ?? null,
  };
}
