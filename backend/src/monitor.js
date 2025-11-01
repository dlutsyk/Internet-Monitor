import EventEmitter from 'node:events';
import { createRequire } from 'node:module';
import https from 'node:https';
import * as db from './db.js';

const require = createRequire(import.meta.url);
const NetworkSpeed = require('network-speed');

// Monitor state
let isRunning = false;
let inFlight = false;
let lastRunAt = null;
let timer = null;
let logger = console;
let config = null;

// Event emitter for real-time updates
export const events = new EventEmitter();

// Previous state for event detection
let previousState = {
  status: null,
  downloadMbps: null,
  timestamp: null,
};

/**
 * Initialize monitor
 */
export async function initMonitor(cfg, log = console) {
  config = cfg;
  logger = log;

  // Load previous state from database
  const latest = await db.getLatestMeasurement();
  if (latest) {
    previousState = {
      status: latest.status,
      downloadMbps: latest.downloadMbps,
      timestamp: latest.timestamp,
    };
    logger.info('[monitor] loaded previous state:', previousState);
  }
}

/**
 * Check internet connectivity
 */
async function checkConnectivity() {
  return new Promise((resolve) => {
    const req = https.get(
      config.networkTest.connectivityUrl || 'https://www.google.com',
      { timeout: config.networkTest.timeoutMs || 30000 },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
        res.resume();
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Perform network speed test
 */
async function performSpeedTest() {
  // Check connectivity first
  const hasConnectivity = await checkConnectivity();
  if (!hasConnectivity) {
    return {
      status: 'offline',
      downloadMbps: null,
      uploadMbps: null,
      latencyMs: null,
      jitterMs: null,
      packetLoss: null,
      error: { message: 'No internet connectivity', code: 'NO_CONNECTIVITY' },
      meta: { source: 'network-speed', attempts: 0 },
    };
  }

  // Try speed test with retries
  const maxRetries = config.networkTest.maxRetries || 3;
  const fileSizeBytes = config.networkTest.fileSizeBytes || 20_000_000;
  const uploadSizeBytes = config.networkTest.uploadSizeBytes || 5_000_000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const testSpeed = new NetworkSpeed();
      const downloadUrl = `https://httpbin.org/stream-bytes/${fileSizeBytes}`;
      const uploadUrl = 'http://httpbin.org/post'; // network-speed library only supports http for uploads

      // Test download speed
      const downloadSpeed = await testSpeed.checkDownloadSpeed(downloadUrl, fileSizeBytes);
      const downloadMbps = Math.round(downloadSpeed.mbps * 100) / 100;
      const latencyMs = Math.round((downloadSpeed.latency || 0) * 100) / 100;

      // Validate reasonable download speed
      const maxSpeed = config.networkTest.maxRealisticSpeed || 1000;
      if (downloadMbps > maxSpeed) {
        throw new Error(`Unrealistic download speed detected: ${downloadMbps} Mbps`);
      }

      // Test upload speed
      let uploadMbps = null;
      try {
        logger.info(`[monitor] testing upload speed to ${uploadUrl}...`);
        const uploadSpeed = await testSpeed.checkUploadSpeed(uploadUrl, uploadSizeBytes);
        uploadMbps = Math.round(uploadSpeed.mbps * 100) / 100;
        logger.info(`[monitor] upload test completed: ${uploadMbps} Mbps`);

        // Validate reasonable upload speed
        const maxUploadSpeed = config.networkTest.maxRealisticUploadSpeed || 500;
        if (uploadMbps > maxUploadSpeed) {
          logger.warn(`[monitor] unrealistic upload speed detected: ${uploadMbps} Mbps, setting to null`);
          uploadMbps = null;
        }
      } catch (uploadError) {
        logger.warn(`[monitor] upload test failed: ${uploadError.message}`);
        // Continue with null upload speed - not critical
        uploadMbps = null;
      }

      return {
        status: 'online',
        downloadMbps,
        uploadMbps,
        latencyMs,
        jitterMs: null,
        packetLoss: null,
        error: null,
        meta: {
          source: 'network-speed',
          attempts: attempt,
          downloadTestUrl: downloadUrl,
          uploadTestUrl: uploadUrl,
        },
      };
    } catch (error) {
      logger.warn(`[monitor] speed test attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt === maxRetries) {
        return {
          status: 'degraded',
          downloadMbps: null,
          uploadMbps: null,
          latencyMs: null,
          jitterMs: null,
          packetLoss: null,
          error: { message: error.message, code: 'SPEED_TEST_FAILED' },
          meta: { source: 'network-speed', attempts: attempt },
        };
      }
    }
  }
}

/**
 * Detect events from measurement
 */
function detectEvents(measurement) {
  const { status, downloadMbps, timestamp } = measurement;
  const detectedEvents = [];

  // Connection state changes
  if (previousState.status !== null) {
    if (previousState.status === 'online' && status === 'offline') {
      detectedEvents.push({
        id: `evt_${Date.now()}_connection_lost`,
        type: 'connection_lost',
        timestamp,
        metadata: {
          previousDownloadMbps: previousState.downloadMbps,
          lastOnlineTimestamp: previousState.timestamp,
        },
      });
    }

    if (previousState.status === 'offline' && status === 'online') {
      detectedEvents.push({
        id: `evt_${Date.now()}_connection_restored`,
        type: 'connection_restored',
        timestamp,
        metadata: {
          currentDownloadMbps: downloadMbps,
          lastOfflineTimestamp: previousState.timestamp,
        },
      });
    }
  }

  // Speed changes (only when both online)
  if (
    status === 'online' &&
    previousState.status === 'online' &&
    previousState.downloadMbps !== null &&
    downloadMbps !== null
  ) {
    const previousSpeed = previousState.downloadMbps;
    const currentSpeed = downloadMbps;
    const dropMbps = previousSpeed - currentSpeed;
    const dropPercent = previousSpeed > 0 ? (dropMbps / previousSpeed) * 100 : 0;

    const speedDropThreshold = config.speedDropThresholdMbps || 15;
    const speedDropPercentThreshold = config.speedDropPercent || 30;

    // Speed degradation
    if (dropMbps >= speedDropThreshold || dropPercent >= speedDropPercentThreshold) {
      detectedEvents.push({
        id: `evt_${Date.now()}_speed_degradation`,
        type: 'speed_degradation',
        timestamp,
        metadata: {
          previousMbps: Math.round(previousSpeed * 100) / 100,
          currentMbps: Math.round(currentSpeed * 100) / 100,
          dropMbps: Math.round(dropMbps * 100) / 100,
          dropPercent: Math.round(dropPercent * 100) / 100,
        },
      });
    }

    // Speed improved
    const improveMbps = currentSpeed - previousSpeed;
    const improvePercent = previousSpeed > 0 ? (improveMbps / previousSpeed) * 100 : 0;

    if (improveMbps >= speedDropThreshold || improvePercent >= speedDropPercentThreshold) {
      detectedEvents.push({
        id: `evt_${Date.now()}_speed_improved`,
        type: 'speed_improved',
        timestamp,
        metadata: {
          previousMbps: Math.round(previousSpeed * 100) / 100,
          currentMbps: Math.round(currentSpeed * 100) / 100,
          improveMbps: Math.round(improveMbps * 100) / 100,
          improvePercent: Math.round(improvePercent * 100) / 100,
        },
      });
    }
  }

  return detectedEvents;
}

/**
 * Perform a single measurement
 */
export async function performMeasurement({ force = false } = {}) {
  if (inFlight) {
    logger.debug('[monitor] measurement already in flight');
    return null;
  }

  if (!isRunning && !force) {
    logger.debug('[monitor] not running, skipping measurement');
    return null;
  }

  inFlight = true;
  const startedAt = Date.now();
  const durationSinceLast = lastRunAt ? startedAt - lastRunAt : config.intervalMs;

  try {
    // Perform speed test (or simulation if enabled)
    let rawData;
    if (config.simulationMode) {
      rawData = {
        status: 'online',
        downloadMbps: Math.random() * 100 + 50,
        uploadMbps: Math.random() * 50 + 20,
        latencyMs: Math.random() * 20 + 10,
        jitterMs: Math.random() * 5,
        packetLoss: 0,
        meta: { source: 'simulation' },
      };
    } else {
      rawData = await performSpeedTest();
    }

    const measurement = {
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
        intervalMs: config.intervalMs,
      },
      server: rawData.server,
      client: rawData.client,
    };

    // Store measurement
    const stored = await db.insertMeasurement(measurement);

    // Detect and store events
    const detectedEvents = detectEvents(measurement);
    for (const event of detectedEvents) {
      try {
        const inserted = await db.insertEvent(event);
        logger.info(`[monitor] detected and saved event: ${event.type} (id: ${event.id})`);
        events.emit('event', event);
      } catch (error) {
        logger.error(`[monitor] failed to save event ${event.type}:`, error.message);
        // Still emit the event even if DB save fails
        events.emit('event', event);
      }
    }

    // Update previous state
    previousState = {
      status: measurement.status,
      downloadMbps: measurement.downloadMbps,
      timestamp: measurement.timestamp,
    };

    lastRunAt = startedAt;

    // Emit measurement event
    events.emit('measurement', stored);

    return stored;
  } catch (error) {
    logger.error('[monitor] measurement failed:', error);
    throw error;
  } finally {
    inFlight = false;
  }
}

/**
 * Start monitoring loop
 */
export async function startMonitoring() {
  if (isRunning) {
    logger.warn('[monitor] already running');
    return;
  }

  isRunning = true;
  logger.info('[monitor] starting monitoring');

  // Perform initial measurement
  try {
    await performMeasurement({ force: true });
  } catch (error) {
    logger.error('[monitor] initial measurement failed:', error);
  }

  // Schedule periodic measurements
  timer = setInterval(() => {
    performMeasurement().catch((error) => {
      logger.error('[monitor] periodic measurement failed:', error);
    });
  }, config.intervalMs);

  logger.info(`[monitor] monitoring started (interval: ${config.intervalMs}ms)`);
}

/**
 * Stop monitoring loop
 */
export function stopMonitoring() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isRunning = false;
  logger.info('[monitor] monitoring stopped');
}

/**
 * Get monitoring status
 */
export function getStatus() {
  return {
    isRunning,
    inFlight,
    lastRunAt,
    intervalMs: config.intervalMs,
  };
}
