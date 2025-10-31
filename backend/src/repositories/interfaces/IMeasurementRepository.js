/**
 * IMeasurementRepository Interface
 * Defines the contract for measurement data access
 *
 * Design Patterns Applied:
 * - Repository Pattern: Abstracts data access logic
 * - Interface Segregation Principle: Single responsibility interface
 *
 * SOLID Principles:
 * - ISP: Focused interface for measurement operations only
 * - DIP: High-level code depends on this abstraction, not concrete implementations
 */
export default class IMeasurementRepository {
  /**
   * Initializes the repository
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('Method not implemented');
  }

  /**
   * Inserts a new measurement
   * @param {Measurement} measurement
   * @returns {Promise<Measurement>}
   */
  async insert(measurement) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds a measurement by ID
   * @param {number} id
   * @returns {Promise<Measurement|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds the most recent N measurements
   * @param {number} limit
   * @returns {Promise<Array<Measurement>>}
   */
  async findRecent(limit) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds measurements within a date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Measurement>>}
   */
  async findByDateRange(fromDate, toDate) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds the latest measurement
   * @returns {Promise<Measurement|null>}
   */
  async findLatest() {
    throw new Error('Method not implemented');
  }

  /**
   * Deletes measurements older than the specified date
   * @param {Date|string} beforeDate
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteOlderThan(beforeDate) {
    throw new Error('Method not implemented');
  }

  /**
   * Counts total measurements
   * @returns {Promise<number>}
   */
  async count() {
    throw new Error('Method not implemented');
  }

  /**
   * Gets the date range of measurements
   * @returns {Promise<{oldest: string|null, newest: string|null}>}
   */
  async getDateRange() {
    throw new Error('Method not implemented');
  }
}
