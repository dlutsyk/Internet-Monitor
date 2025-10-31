/**
 * IEventRepository Interface
 * Defines the contract for event data access
 *
 * Design Patterns Applied:
 * - Repository Pattern: Abstracts data access logic
 * - Interface Segregation Principle: Single responsibility interface
 *
 * SOLID Principles:
 * - ISP: Focused interface for event operations only
 * - DIP: High-level code depends on this abstraction, not concrete implementations
 */
export default class IEventRepository {
  /**
   * Initializes the repository
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('Method not implemented');
  }

  /**
   * Inserts a new event
   * @param {Event} event
   * @returns {Promise<Event>}
   */
  async insert(event) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds an event by ID
   * @param {string} id
   * @returns {Promise<Event|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds the most recent N events
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async findRecent(limit) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds events within a date range
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @returns {Promise<Array<Event>>}
   */
  async findByDateRange(fromDate, toDate) {
    throw new Error('Method not implemented');
  }

  /**
   * Finds events by type
   * @param {string} type
   * @param {number} limit
   * @returns {Promise<Array<Event>>}
   */
  async findByType(type, limit) {
    throw new Error('Method not implemented');
  }

  /**
   * Deletes events older than the specified date
   * @param {Date|string} beforeDate
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteOlderThan(beforeDate) {
    throw new Error('Method not implemented');
  }

  /**
   * Counts total events
   * @returns {Promise<number>}
   */
  async count() {
    throw new Error('Method not implemented');
  }

  /**
   * Gets the date range of events
   * @returns {Promise<{oldest: string|null, newest: string|null}>}
   */
  async getDateRange() {
    throw new Error('Method not implemented');
  }
}
