/**
 * Event Domain Model
 * Represents a network event (connection-lost, connection-restored, speed changes, etc.)
 *
 * Design Patterns Applied:
 * - Value Object (immutable after creation)
 * - Factory Method (static factory methods for different event types)
 *
 * SOLID Principles:
 * - SRP: Only responsible for representing an event
 * - OCP: Extensible through factory methods for new event types
 */
export default class Event {
  // Event type constants
  static TYPE_CONNECTION_LOST = 'connection-lost';
  static TYPE_CONNECTION_RESTORED = 'connection-restored';
  static TYPE_SPEED_DEGRADATION = 'speed-degradation';
  static TYPE_SPEED_IMPROVED = 'speed-improved';

  constructor({ id, type, timestamp, metadata = {} }) {
    this.id = id;
    this.type = type;
    this.timestamp = timestamp;
    this.metadata = metadata;

    this.validate();
  }

  /**
   * Validates the event data
   * @throws {Error} if validation fails
   */
  validate() {
    if (!this.id) {
      throw new Error('Event must have an id');
    }

    if (!this.type) {
      throw new Error('Event must have a type');
    }

    if (!this.timestamp) {
      throw new Error('Event must have a timestamp');
    }

    const validTypes = [
      Event.TYPE_CONNECTION_LOST,
      Event.TYPE_CONNECTION_RESTORED,
      Event.TYPE_SPEED_DEGRADATION,
      Event.TYPE_SPEED_IMPROVED,
    ];

    if (!validTypes.includes(this.type)) {
      throw new Error(`Invalid event type: ${this.type}`);
    }
  }

  /**
   * Checks if this is a connection-lost event
   * @returns {boolean}
   */
  isConnectionLost() {
    return this.type === Event.TYPE_CONNECTION_LOST;
  }

  /**
   * Checks if this is a connection-restored event
   * @returns {boolean}
   */
  isConnectionRestored() {
    return this.type === Event.TYPE_CONNECTION_RESTORED;
  }

  /**
   * Checks if this is a speed degradation event
   * @returns {boolean}
   */
  isSpeedDegradation() {
    return this.type === Event.TYPE_SPEED_DEGRADATION;
  }

  /**
   * Checks if this is a speed improved event
   * @returns {boolean}
   */
  isSpeedImproved() {
    return this.type === Event.TYPE_SPEED_IMPROVED;
  }

  /**
   * Converts the event to a plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }

  /**
   * Factory method to create an Event from database row
   * @param {Object} row - Database row
   * @returns {Event}
   */
  static fromDatabaseRow(row) {
    return new Event({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    });
  }

  /**
   * Factory method to create a connection-lost event
   * @param {string} timestamp
   * @param {Object} metadata
   * @returns {Event}
   */
  static createConnectionLost(timestamp, metadata = {}) {
    return new Event({
      id: Event.generateId(),
      type: Event.TYPE_CONNECTION_LOST,
      timestamp,
      metadata,
    });
  }

  /**
   * Factory method to create a connection-restored event
   * @param {string} timestamp
   * @param {Object} metadata
   * @returns {Event}
   */
  static createConnectionRestored(timestamp, metadata = {}) {
    return new Event({
      id: Event.generateId(),
      type: Event.TYPE_CONNECTION_RESTORED,
      timestamp,
      metadata,
    });
  }

  /**
   * Factory method to create a speed-degradation event
   * @param {string} timestamp
   * @param {Object} metadata
   * @returns {Event}
   */
  static createSpeedDegradation(timestamp, metadata = {}) {
    return new Event({
      id: Event.generateId(),
      type: Event.TYPE_SPEED_DEGRADATION,
      timestamp,
      metadata,
    });
  }

  /**
   * Factory method to create a speed-improved event
   * @param {string} timestamp
   * @param {Object} metadata
   * @returns {Event}
   */
  static createSpeedImproved(timestamp, metadata = {}) {
    return new Event({
      id: Event.generateId(),
      type: Event.TYPE_SPEED_IMPROVED,
      timestamp,
      metadata,
    });
  }

  /**
   * Generates a unique event ID
   * @returns {string}
   */
  static generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
