import NetworkSpeedMonitor from './NetworkSpeedMonitor.js';
import SimulationMonitor from './SimulationMonitor.js';

/**
 * Monitoring Strategy Factory
 * Creates appropriate monitoring strategy based on configuration
 *
 * Design Patterns Applied:
 * - Factory Pattern: Creates objects without specifying exact class
 * - Strategy Pattern: Returns strategies conforming to IMonitoringStrategy
 *
 * SOLID Principles:
 * - SRP: Only responsible for creating monitoring strategies
 * - OCP: New strategies can be added without modifying existing code
 * - DIP: Returns abstractions (IMonitoringStrategy) not concrete types
 *
 * GRASP Principles:
 * - Creator: Responsible for creating monitoring strategies
 * - Pure Fabrication: Created to handle object creation logic
 */
export default class MonitoringStrategyFactory {
  /**
   * Creates a monitoring strategy based on mode
   * @param {string} mode - 'simulation' or 'real'
   * @param {Object} options - Configuration options
   * @returns {IMonitoringStrategy}
   */
  static create(mode, options = {}) {
    const { logger = console, config = {} } = options;

    switch (mode) {
      case 'simulation':
        logger.info('[MonitoringStrategyFactory] creating SimulationMonitor');
        return new SimulationMonitor({ logger });

      case 'real':
      default:
        logger.info('[MonitoringStrategyFactory] creating NetworkSpeedMonitor');
        return new NetworkSpeedMonitor({ logger, config });
    }
  }

  /**
   * Creates monitoring strategy from configuration
   * @param {Object} config - Configuration object
   * @returns {IMonitoringStrategy}
   */
  static fromConfig(config) {
    const mode = config.simulationMode ? 'simulation' : 'real';
    return MonitoringStrategyFactory.create(mode, {
      logger: console,
      config: {
        ...config.networkTest,
        timeoutMs: config.speedTestMaxTime || 20000,
      },
    });
  }
}
