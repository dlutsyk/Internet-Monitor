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
  dataDir: process.env.DATA_DIR ?? path.join(projectRoot, 'data'),
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
};

config.dataFile = path.join(config.dataDir, 'measurements.jsonl');

export default config;
