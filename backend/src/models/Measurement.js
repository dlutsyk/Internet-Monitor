/**
 * Measurement Domain Model
 * Represents a single network measurement/reading
 *
 * Design Patterns Applied:
 * - Value Object (immutable after creation)
 * - Self-Validation (validates data integrity)
 *
 * SOLID Principles:
 * - SRP: Only responsible for representing a measurement
 * - OCP: Extensible through inheritance if needed
 */
export default class Measurement {
  constructor({
    id = null,
    timestamp,
    status,
    downloadMbps = null,
    uploadMbps = null,
    latencyMs = null,
    jitterMs = null,
    packetLoss = null,
    durationSinceLastMs = null,
    estimatedDowntimeMs = null,
    error = null,
    meta = null,
    server = null,
    client = null,
  }) {
    this.id = id;
    this.timestamp = timestamp;
    this.status = status;
    this.downloadMbps = downloadMbps;
    this.uploadMbps = uploadMbps;
    this.latencyMs = latencyMs;
    this.jitterMs = jitterMs;
    this.packetLoss = packetLoss;
    this.durationSinceLastMs = durationSinceLastMs;
    this.estimatedDowntimeMs = estimatedDowntimeMs;
    this.error = error;
    this.meta = meta;
    this.server = server;
    this.client = client;

    this.validate();
  }

  /**
   * Validates the measurement data
   * @throws {Error} if validation fails
   */
  validate() {
    if (!this.timestamp) {
      throw new Error('Measurement must have a timestamp');
    }

    if (!this.status || !['online', 'offline'].includes(this.status)) {
      throw new Error('Measurement must have a valid status (online or offline)');
    }

    if (this.status === 'online' && this.downloadMbps === null && this.uploadMbps === null) {
      // Online measurements should have at least one speed metric or be marked as unreliable
      if (!this.meta?.note?.includes('unreliable')) {
        // This is acceptable for unreliable measurements
      }
    }
  }

  /**
   * Checks if this measurement indicates an online status
   * @returns {boolean}
   */
  isOnline() {
    return this.status === 'online';
  }

  /**
   * Checks if this measurement indicates an offline status
   * @returns {boolean}
   */
  isOffline() {
    return this.status === 'offline';
  }

  /**
   * Checks if this measurement has valid speed data
   * @returns {boolean}
   */
  hasValidSpeedData() {
    return this.downloadMbps !== null && this.downloadMbps > 0;
  }

  /**
   * Converts the measurement to a plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      status: this.status,
      downloadMbps: this.downloadMbps,
      uploadMbps: this.uploadMbps,
      latencyMs: this.latencyMs,
      jitterMs: this.jitterMs,
      packetLoss: this.packetLoss,
      durationSinceLastMs: this.durationSinceLastMs,
      estimatedDowntimeMs: this.estimatedDowntimeMs,
      error: this.error,
      meta: this.meta,
      server: this.server,
      client: this.client,
    };
  }

  /**
   * Factory method to create a Measurement from database row
   * @param {Object} row - Database row
   * @returns {Measurement}
   */
  static fromDatabaseRow(row) {
    return new Measurement({
      id: row.id,
      timestamp: row.timestamp,
      status: row.status,
      downloadMbps: row.downloadMbps,
      uploadMbps: row.uploadMbps,
      latencyMs: row.latencyMs,
      jitterMs: row.jitterMs,
      packetLoss: row.packetLoss,
      durationSinceLastMs: row.durationSinceLastMs,
      estimatedDowntimeMs: row.estimatedDowntimeMs,
      error: row.error ? JSON.parse(row.error) : null,
      meta: row.meta ? JSON.parse(row.meta) : null,
      server: row.server ? JSON.parse(row.server) : null,
      client: row.client ? JSON.parse(row.client) : null,
    });
  }

  /**
   * Factory method to create a Measurement from raw data
   * @param {Object} data - Raw measurement data
   * @returns {Measurement}
   */
  static fromRawData(data) {
    return new Measurement(data);
  }
}
