import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const envNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const envBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = {
  port: envNumber(process.env.PORT, 3001),
  host: process.env.HOST ?? '0.0.0.0',
  intervalMs: envNumber(process.env.MONITOR_INTERVAL_MS, 60_000),
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(projectRoot, 'data'),
  wsPath: process.env.WS_PATH ?? '/ws',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null,
  httpLogging: envBoolean(process.env.HTTP_LOGGING, true),
  speedDropThresholdMbps: envNumber(process.env.SPEED_DROP_THRESHOLD_MBPS, 15),
  speedDropPercent: envNumber(process.env.SPEED_DROP_PERCENT, 30),
  retentionHours: envNumber(process.env.RETENTION_HOURS, 24 * 7),
  speedTestMaxTime: envNumber(process.env.SPEED_TEST_MAX_TIME, 20_000),
  simulationMode: envBoolean(process.env.SIMULATION_MODE, false),
  archiveEnabled: envBoolean(process.env.ARCHIVE_ENABLED, true),
  archiveHour: envNumber(process.env.ARCHIVE_HOUR, 0),
  archiveRetentionDays: envNumber(process.env.ARCHIVE_RETENTION_DAYS, 30),
  // Network speed test configuration
  networkTest: {
    fileSizeBytes: envNumber(process.env.NETWORK_TEST_FILE_SIZE_BYTES, 20_000_000),
    uploadSizeBytes: envNumber(process.env.NETWORK_TEST_UPLOAD_SIZE_BYTES, 5_000_000),
    maxRetries: envNumber(process.env.NETWORK_TEST_MAX_RETRIES, 3),
    timeoutMs: envNumber(process.env.NETWORK_TEST_TIMEOUT_MS, 30000),
    connectivityUrl: process.env.NETWORK_TEST_CONNECTIVITY_URL ?? 'https://www.google.com',
    maxRealisticSpeed: envNumber(process.env.NETWORK_TEST_MAX_REALISTIC_SPEED, 1000),
    maxRealisticUploadSpeed: envNumber(process.env.NETWORK_TEST_MAX_REALISTIC_UPLOAD_SPEED, 500),
  },
};

config.dataFile = path.join(config.dataDir, 'measurements.jsonl');
config.eventsFile = path.join(config.dataDir, 'events.jsonl');
config.dbFile = path.join(config.dataDir, 'monitor.db');
config.historyDir = path.join(config.dataDir, 'history');

export default config;
