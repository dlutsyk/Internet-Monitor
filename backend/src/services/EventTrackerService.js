import EventEmitter from 'node:events';
import Event from '../models/Event.js';

/**
 * Event Tracker Service
 * Analyzes measurements and detects network events
 *
 * Design Patterns Applied:
 * - Observer Pattern: Emits events when detected
 * - Template Method: Defines skeleton of event detection algorithm
 *
 * SOLID Principles:
 * - SRP: Only responsible for event detection and tracking
 * - OCP: Can be extended with new event types
 * - DIP: Depends on repository abstraction
 *
 * GRASP Principles:
 * - Information Expert: Knows how to detect events from measurements
 * - Low Coupling: Depends only on repository and models
 * - High Cohesion: All methods related to event tracking
 */
export default class EventTrackerService extends EventEmitter {
  constructor(eventRepository, measurementRepository, options = {}) {
    super();
    this.eventRepository = eventRepository;
    this.measurementRepository = measurementRepository;
    this.speedDropThresholdMbps = options.speedDropThresholdMbps || 15;
    this.speedDropPercent = options.speedDropPercent || 30;
    this.speedImproveThresholdMbps = options.speedImproveThresholdMbps || 15;
    this.speedImprovePercent = options.speedImprovePercent || 30;
    this.logger = options.logger || console;

    // Track previous state
    this.previousState = {
      status: null,
      downloadMbps: null,
      timestamp: null,
    };
  }

  /**
   * Initializes the service by loading previous state
   * @returns {Promise<void>}
   */
  async init() {
    // Load last measurement state for continuity
    const lastState = await this.measurementRepository.getLastState();
    if (lastState) {
      this.previousState = {
        status: lastState.status,
        downloadMbps: lastState.downloadMbps,
        timestamp: lastState.timestamp,
      };
      this.logger.info('[EventTrackerService] initialized with previous state:', this.previousState);
    }
  }

  /**
   * Analyzes a measurement and detects events
   * @param {Measurement} measurement
   * @returns {Promise<Array<Event>>}
   */
  async analyzeMeasurement(measurement) {
    const { status, downloadMbps, timestamp } = measurement;
    const detectedEvents = [];

    // Detect connection state changes
    if (this.previousState.status !== null) {
      // Connection lost
      if (this.previousState.status === 'online' && status === 'offline') {
        const event = Event.createConnectionLost(timestamp, {
          previousDownloadMbps: this.previousState.downloadMbps,
          lastOnlineTimestamp: this.previousState.timestamp,
        });
        detectedEvents.push(event);
      }

      // Connection restored
      if (this.previousState.status === 'offline' && status === 'online') {
        const event = Event.createConnectionRestored(timestamp, {
          currentDownloadMbps: downloadMbps,
          lastOfflineTimestamp: this.previousState.timestamp,
        });
        detectedEvents.push(event);
      }
    }

    // Detect speed changes (only when both current and previous are online)
    if (
      status === 'online' &&
      this.previousState.status === 'online' &&
      this.previousState.downloadMbps !== null &&
      downloadMbps !== null
    ) {
      const previousSpeed = this.previousState.downloadMbps;
      const currentSpeed = downloadMbps;
      const dropMbps = previousSpeed - currentSpeed;
      const dropPercent = previousSpeed > 0 ? (dropMbps / previousSpeed) * 100 : 0;

      // Speed degradation
      if (
        dropMbps >= this.speedDropThresholdMbps ||
        dropPercent >= this.speedDropPercent
      ) {
        const event = Event.createSpeedDegradation(timestamp, {
          previousMbps: Math.round(previousSpeed * 100) / 100,
          currentMbps: Math.round(currentSpeed * 100) / 100,
          dropMbps: Math.round(dropMbps * 100) / 100,
          dropPercent: Math.round(dropPercent * 100) / 100,
        });
        detectedEvents.push(event);
      }

      // Speed improved
      const improveMbps = currentSpeed - previousSpeed;
      const improvePercent = previousSpeed > 0 ? (improveMbps / previousSpeed) * 100 : 0;

      if (
        improveMbps >= this.speedImproveThresholdMbps ||
        improvePercent >= this.speedImprovePercent
      ) {
        const event = Event.createSpeedImproved(timestamp, {
          previousMbps: Math.round(previousSpeed * 100) / 100,
          currentMbps: Math.round(currentSpeed * 100) / 100,
          improveMbps: Math.round(improveMbps * 100) / 100,
          improvePercent: Math.round(improvePercent * 100) / 100,
        });
        detectedEvents.push(event);
      }
    }

    // Store and emit detected events
    for (const event of detectedEvents) {
      await this.eventRepository.insert(event);
      this.emit('event', event);
      this.logger.info(`[EventTrackerService] detected: ${event.type}`, event.metadata);
    }

    // Update previous state
    this.previousState = {
      status,
      downloadMbps,
      timestamp,
    };

    return detectedEvents;
  }

  /**
   * Gets recent events
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async getRecentEvents(limit = 50) {
    return this.eventRepository.findRecent(limit);
  }

  /**
   * Gets events by date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Event>>}
   */
  async getEventsByDateRange(fromDate, toDate) {
    return this.eventRepository.findByDateRange(fromDate, toDate);
  }

  /**
   * Gets events by type
   * @param {string} type
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async getEventsByType(type, limit = 50) {
    return this.eventRepository.findByType(type, limit);
  }

  /**
   * Groups events by type
   * @param {Array<Event>} events
   * @returns {Object}
   */
  groupEventsByType(events) {
    return events.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = [];
      }
      acc[event.type].push(event);
      return acc;
    }, {});
  }

  /**
   * Gets event statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const count = await this.eventRepository.count();
    const dateRange = await this.eventRepository.getDateRange();

    return {
      totalEvents: count,
      oldestEvent: dateRange.oldest,
      newestEvent: dateRange.newest,
    };
  }
}
