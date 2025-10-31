import { createRequire } from 'node:module';
import https from 'node:https';
import IMonitoringStrategy from './IMonitoringStrategy.js';

const require = createRequire(import.meta.url);
const NetworkSpeed = require('network-speed');

/**
 * Real Network Speed Monitoring Strategy
 * Implements actual network speed testing using network-speed library
 *
 * Design Patterns Applied:
 * - Strategy Pattern: Concrete strategy for real network monitoring
 *
 * SOLID Principles:
 * - SRP: Only responsible for real network measurements
 * - OCP: Can be extended or replaced without affecting other code
 * - LSP: Can be used anywhere IMonitoringStrategy is expected
 */
export default class NetworkSpeedMonitor extends IMonitoringStrategy {
  constructor({ logger = console, config = {} } = {}) {
    super();
    this.logger = logger;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.fileSizeBytes = config.fileSizeBytes ?? 20_000_000;
    this.uploadSizeBytes = config.uploadSizeBytes ?? 5_000_000;
    this.connectivityUrl = config.connectivityUrl ?? 'https://www.google.com';
    this.MAX_REALISTIC_SPEED = config.maxRealisticSpeed ?? 1000; // 1 Gbps
    this.MAX_REALISTIC_UPLOAD_SPEED = config.maxRealisticUploadSpeed ?? 500; // 500 Mbps
  }

  /**
   * Checks connectivity to determine if we're online
   * @returns {Promise<boolean>}
   */
  async checkConnectivity() {
    return new Promise((resolve) => {
      const req = https.get(this.connectivityUrl, { timeout: this.timeoutMs }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
        res.resume();
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Fixes number to 2 decimal places
   * @param {number} value
   * @returns {number|null}
   */
  toFixedNumber(value) {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.round(parsed * 100) / 100;
  }

  /**
   * Performs a network measurement
   * @returns {Promise<Object>}
   */
  async measure() {
    // Check connectivity first
    const hasConnectivity = await this.checkConnectivity();
    if (!hasConnectivity) {
      this.logger.warn('[NetworkSpeedMonitor] no connectivity detected');
      return {
        status: 'offline',
        downloadMbps: null,
        uploadMbps: null,
        latencyMs: null,
        packetLoss: null,
        jitterMs: null,
        error: {
          message: 'No internet connectivity',
          code: 'NO_CONNECTIVITY',
        },
        meta: {
          source: 'network-speed',
          attempts: 0,
        },
      };
    }

    // Try speed test with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const testSpeed = new NetworkSpeed();
        const baseUrl = `https://httpbin.org/stream-bytes/${this.fileSizeBytes}`;
        const fileSizeInBytes = this.fileSizeBytes;

        // Test download speed
        const downloadResult = await testSpeed.checkDownloadSpeed(baseUrl, fileSizeInBytes);
        const downloadMbps = this.toFixedNumber(downloadResult?.mbps ?? null);

        // Validate download speed
        const isValidDownload =
          downloadMbps !== null &&
          downloadMbps > 0 &&
          Number.isFinite(downloadMbps) &&
          downloadMbps <= this.MAX_REALISTIC_SPEED;

        if (!isValidDownload) {
          this.logger.warn(
            `[NetworkSpeedMonitor] attempt ${attempt}/${this.maxRetries}: unrealistic download: ${downloadMbps}`
          );

          if (attempt < this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          // Last attempt - check connectivity again
          const stillConnected = await this.checkConnectivity();
          if (!stillConnected) {
            return {
              status: 'offline',
              downloadMbps: null,
              uploadMbps: null,
              latencyMs: null,
              packetLoss: null,
              jitterMs: null,
              error: { message: 'No internet connectivity', code: 'NO_CONNECTIVITY' },
              meta: { source: 'network-speed', attempts: this.maxRetries },
            };
          }

          return {
            status: 'online',
            downloadMbps: null,
            uploadMbps: null,
            latencyMs: null,
            packetLoss: null,
            jitterMs: null,
            meta: {
              source: 'network-speed',
              attempts: this.maxRetries,
              note: 'Speed test unreliable, connectivity confirmed',
            },
          };
        }

        // Test upload speed
        let uploadMbps = null;
        try {
          const uploadOptions = {
            hostname: 'httpbin.org',
            port: 443,
            path: '/post',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          };
          const uploadResult = await testSpeed.checkUploadSpeed(uploadOptions, this.uploadSizeBytes);
          const rawUpload = this.toFixedNumber(uploadResult?.mbps ?? null);

          if (
            rawUpload !== null &&
            Number.isFinite(rawUpload) &&
            rawUpload > 0 &&
            rawUpload <= this.MAX_REALISTIC_UPLOAD_SPEED
          ) {
            uploadMbps = rawUpload;
          }
        } catch (uploadError) {
          this.logger.warn('[NetworkSpeedMonitor] upload test failed', uploadError.message);
        }

        // Success!
        return {
          status: 'online',
          downloadMbps,
          uploadMbps,
          latencyMs: null,
          jitterMs: null,
          packetLoss: null,
          server: { location: null, host: 'httpbin.org', sponsor: null, country: null },
          client: null,
          meta: { source: 'network-speed', testFileSize: fileSizeInBytes, attempts: attempt },
        };
      } catch (error) {
        this.logger.warn(`[NetworkSpeedMonitor] attempt ${attempt}/${this.maxRetries}:`, error.message);

        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Last attempt failed - check connectivity
        const stillConnected = await this.checkConnectivity();
        if (!stillConnected) {
          return {
            status: 'offline',
            downloadMbps: null,
            uploadMbps: null,
            latencyMs: null,
            packetLoss: null,
            jitterMs: null,
            error: { message: 'No internet connectivity', code: 'NO_CONNECTIVITY' },
            meta: { source: 'network-speed', attempts: this.maxRetries },
          };
        }

        return {
          status: 'online',
          downloadMbps: null,
          uploadMbps: null,
          latencyMs: null,
          packetLoss: null,
          jitterMs: null,
          meta: {
            source: 'network-speed',
            attempts: this.maxRetries,
            note: 'Speed test error, connectivity confirmed',
            lastError: error?.message,
          },
        };
      }
    }

    // Fallback
    return {
      status: 'online',
      downloadMbps: null,
      uploadMbps: null,
      latencyMs: null,
      packetLoss: null,
      jitterMs: null,
      meta: { source: 'network-speed', note: 'Fallback response' },
    };
  }

  /**
   * Checks if the strategy is available
   * @returns {boolean}
   */
  isAvailable() {
    return true;
  }
}
