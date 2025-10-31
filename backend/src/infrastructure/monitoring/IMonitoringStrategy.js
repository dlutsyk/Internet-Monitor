/**
 * IMonitoringStrategy Interface
 * Defines the contract for different monitoring strategies
 *
 * Design Patterns Applied:
 * - Strategy Pattern: Defines the interface for different monitoring algorithms
 *
 * SOLID Principles:
 * - OCP: Extensible with new strategies without modifying existing code
 * - DIP: High-level code depends on this abstraction
 */
export default class IMonitoringStrategy {
  /**
   * Performs a measurement
   * @returns {Promise<Object>} Raw measurement data
   */
  async measure() {
    throw new Error('Method not implemented');
  }

  /**
   * Checks if the strategy is available/ready
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('Method not implemented');
  }
}
