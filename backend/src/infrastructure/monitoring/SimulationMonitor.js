import IMonitoringStrategy from './IMonitoringStrategy.js';

/**
 * Simulation Monitoring Strategy
 * Generates simulated network measurements for testing
 *
 * Design Patterns Applied:
 * - Strategy Pattern: Concrete strategy for simulated monitoring
 *
 * SOLID Principles:
 * - SRP: Only responsible for simulated measurements
 * - OCP: Can be extended or replaced without affecting other code
 * - LSP: Can be used anywhere IMonitoringStrategy is expected
 */
export default class SimulationMonitor extends IMonitoringStrategy {
  constructor({ logger = console } = {}) {
    super();
    this.logger = logger;
    this.state = {
      baseDownload: this.randomInRange(70, 150),
      baseUpload: this.randomInRange(15, 40),
      lastDownload: null,
    };
  }

  /**
   * Generates a random number in range
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Makes a random choice based on probability
   * @param {number} probability
   * @returns {boolean}
   */
  choose(probability) {
    return Math.random() < probability;
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
   * Performs a simulated measurement
   * @returns {Promise<Object>}
   */
  async measure() {
    // Simulate occasional offline status
    if (this.choose(0.08)) {
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

    // Drift the base speeds slightly over time
    const drift = this.randomInRange(-5, 5);
    this.state.baseDownload = Math.max(10, this.state.baseDownload + drift);
    this.state.baseUpload = Math.max(5, this.state.baseUpload + drift / 3);

    // Generate download speed with variation
    let download = this.randomInRange(
      this.state.baseDownload * 0.7,
      this.state.baseDownload * 1.1
    );

    // Simulate occasional speed drops
    if (this.choose(0.15)) {
      download *= this.randomInRange(0.3, 0.6);
    }

    const upload = this.randomInRange(
      this.state.baseUpload * 0.7,
      this.state.baseUpload * 1.05
    );
    const latency = this.randomInRange(10, 80);

    this.state.lastDownload = download;

    return {
      status: 'online',
      downloadMbps: this.toFixedNumber(download),
      uploadMbps: this.toFixedNumber(upload),
      latencyMs: this.toFixedNumber(latency),
      jitterMs: this.toFixedNumber(this.randomInRange(1, 10)),
      packetLoss: this.toFixedNumber(this.choose(0.05) ? this.randomInRange(1, 5) : 0),
      meta: {
        source: 'simulation',
      },
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
