import EventEmitter from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const NetworkSpeed = require('network-speed');

const toFixedNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
};

const choose = (probability) => Math.random() < probability;

const randomInRange = (min, max) => Math.random() * (max - min) + min;

export default class Monitor extends EventEmitter {
  constructor({
    storage,
    intervalMs,
    speedTestMaxTime,
    simulationMode = false,
    logger = console,
  }) {
    super();
    this.storage = storage;
    this.intervalMs = intervalMs;
    this.speedTestMaxTime = speedTestMaxTime;
    this.simulationMode = simulationMode;
    this.logger = logger;

    this.timer = null;
    this.running = false;
    this.inFlight = false;
    this.lastRunAt = null;
    this.simState = null;
  }

  async start() {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.collect({ force: true });
    } catch (error) {
      this.logger.error('[monitor] initial collection failed', error);
    }
    this.timer = setInterval(() => {
      this.collect().catch((error) => {
        this.logger.error('[monitor] collect error', error);
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  async collect({ force = false } = {}) {
    if (this.inFlight) {
      return null;
    }
    if (!this.running && !force) {
      return null;
    }
    this.inFlight = true;
    const startedAt = Date.now();
    const durationSinceLast = this.lastRunAt ? startedAt - this.lastRunAt : this.intervalMs;

    try {
      const measurement = await this.measure();
      const record = {
        ...measurement,
        timestamp: new Date(startedAt).toISOString(),
        durationSinceLastMs: durationSinceLast,
        meta: {
          ...(measurement.meta ?? {}),
          intervalMs: this.intervalMs,
          simulation: this.simulationMode,
        },
      };

      if (record.status !== 'online') {
        record.estimatedDowntimeMs = durationSinceLast;
      }

      await this.storage.append(record);
      this.emit('measurement', record);
      this.lastRunAt = startedAt;
      return record;
    } catch (error) {
      this.logger.error('[monitor] failed to store measurement', error);
      throw error;
    } finally {
      this.inFlight = false;
    }
  }

  async triggerOnce() {
    const record = await this.collect({ force: true });
    if (record) {
      return record;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('measurement', listener);
        reject(new Error('Timed out waiting for monitor result'));
      }, this.speedTestMaxTime + this.intervalMs + 5_000);

      const listener = (data) => {
        clearTimeout(timeout);
        this.off('measurement', listener);
        resolve(data);
      };

      this.once('measurement', listener);
    });
  }

  async measure() {
    if (this.simulationMode) {
      return this.simulateMeasurement();
    }

    try {
      const testSpeed = new NetworkSpeed();

      // Test download speed using a test file
      // Using httpbin.org which provides test endpoints
      const baseUrl = 'https://httpbin.org/stream-bytes/5000000';
      const fileSizeInBytes = 5000000; // 5MB test file

      const downloadResult = await testSpeed.checkDownloadSpeed(baseUrl, fileSizeInBytes);

      // Try to test upload speed
      let uploadMbps = null;
      try {
        const uploadOptions = {
          hostname: 'httpbin.org',
          port: 443,
          path: '/post',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const uploadResult = await testSpeed.checkUploadSpeed(uploadOptions, 1000000); // 1MB
        uploadMbps = toFixedNumber(uploadResult?.mbps ?? null);
      } catch (uploadError) {
        // Upload test failed, continue with download only
        this.logger.warn('[monitor] upload test failed', uploadError.message);
      }

      const downloadMbps = toFixedNumber(downloadResult?.mbps ?? null);

      return {
        status: 'online',
        downloadMbps,
        uploadMbps,
        latencyMs: null, // network-speed doesn't provide latency
        jitterMs: null,
        packetLoss: null,
        server: {
          location: null,
          host: 'httpbin.org',
          sponsor: null,
          country: null,
        },
        client: null,
        meta: {
          source: 'network-speed',
          testFileSize: fileSizeInBytes,
        },
      };
    } catch (error) {
      return {
        status: 'offline',
        downloadMbps: null,
        uploadMbps: null,
        latencyMs: null,
        packetLoss: null,
        jitterMs: null,
        error: {
          message: error?.message ?? 'Speed test failed',
          code: error?.code ?? null,
        },
        meta: {
          source: 'network-speed',
        },
      };
    }
  }

  simulateMeasurement() {
    if (!this.simState) {
      this.simState = {
        baseDownload: randomInRange(70, 150),
        baseUpload: randomInRange(15, 40),
        lastDownload: null,
      };
    }

    if (choose(0.08)) {
      return {
        status: 'offline',
        downloadMbps: null,
        uploadMbps: null,
        latencyMs: null,
        packetLoss: null,
        jitterMs: null,
        error: {
          message: 'Simulated connectivity loss',
        },
        meta: {
          source: 'simulation',
        },
      };
    }

    const drift = randomInRange(-5, 5);
    this.simState.baseDownload = Math.max(10, this.simState.baseDownload + drift);
    this.simState.baseUpload = Math.max(5, this.simState.baseUpload + drift / 3);

    let download = randomInRange(
      this.simState.baseDownload * 0.7,
      this.simState.baseDownload * 1.1,
    );
    if (choose(0.15)) {
      download *= randomInRange(0.3, 0.6);
    }
    const upload = randomInRange(this.simState.baseUpload * 0.7, this.simState.baseUpload * 1.05);
    const latency = randomInRange(10, 80);

    this.simState.lastDownload = download;

    return {
      status: 'online',
      downloadMbps: toFixedNumber(download),
      uploadMbps: toFixedNumber(upload),
      latencyMs: toFixedNumber(latency),
      jitterMs: toFixedNumber(randomInRange(1, 10)),
      packetLoss: toFixedNumber(choose(0.05) ? randomInRange(1, 5) : 0),
      meta: {
        source: 'simulation',
      },
    };
  }
}
