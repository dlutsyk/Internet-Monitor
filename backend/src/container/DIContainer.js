import Database from '../infrastructure/database/Database.js';
import MeasurementRepository from '../repositories/implementations/MeasurementRepository.js';
import EventRepository from '../repositories/implementations/EventRepository.js';
import MonitoringStrategyFactory from '../infrastructure/monitoring/MonitoringStrategyFactory.js';
import MonitorService from '../services/MonitorService.js';
import AnalyticsService from '../services/AnalyticsService.js';
import EventTrackerService from '../services/EventTrackerService.js';
import ArchiveService from '../services/ArchiveService.js';
import SchedulerService from '../services/SchedulerService.js';
import HealthController from '../controllers/HealthController.js';
import MetricsController from '../controllers/MetricsController.js';
import ReportsController from '../controllers/ReportsController.js';
import MonitorController from '../controllers/MonitorController.js';
import ArchiveController from '../controllers/ArchiveController.js';
import EventController from '../controllers/EventController.js';
import StatisticsController from '../controllers/StatisticsController.js';

/**
 * Dependency Injection Container
 * Manages object lifecycle and dependencies
 *
 * Design Patterns Applied:
 * - Service Locator Pattern: Central registry for services
 * - Singleton Pattern: Ensures single instance of each service
 * - Factory Pattern: Creates and wires dependencies
 * - Dependency Injection: Injects dependencies through constructors
 *
 * SOLID Principles:
 * - SRP: Only responsible for object creation and lifecycle
 * - DIP: All components depend on abstractions
 *
 * GRASP Principles:
 * - Creator: Responsible for creating all application objects
 * - Pure Fabrication: Created to handle dependency management
 * - Low Coupling: Components get dependencies through injection
 */
export default class DIContainer {
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;
    this.instances = new Map();
  }

  /**
   * Initializes the container and creates all instances
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('[DIContainer] initializing dependency injection container');

    // Infrastructure Layer
    await this.createDatabase();
    await this.createRepositories();
    this.createMonitoringStrategy();

    // Service Layer
    await this.createServices();

    // Controller Layer
    this.createControllers();

    this.logger.info('[DIContainer] dependency injection container initialized');
  }

  /**
   * Creates database instance
   */
  async createDatabase() {
    const database = new Database(this.config.dbFile, this.logger);
    await database.init();
    this.instances.set('database', database);
  }

  /**
   * Creates repository instances
   */
  async createRepositories() {
    const database = this.get('database');

    // Measurement Repository
    const measurementRepository = new MeasurementRepository(database);
    await measurementRepository.init();
    this.instances.set('measurementRepository', measurementRepository);

    // Event Repository
    const eventRepository = new EventRepository(database);
    await eventRepository.init();
    this.instances.set('eventRepository', eventRepository);
  }

  /**
   * Creates monitoring strategy
   */
  createMonitoringStrategy() {
    const strategy = MonitoringStrategyFactory.fromConfig(this.config);
    this.instances.set('monitoringStrategy', strategy);
  }

  /**
   * Creates service instances
   */
  async createServices() {
    const measurementRepository = this.get('measurementRepository');
    const eventRepository = this.get('eventRepository');
    const monitoringStrategy = this.get('monitoringStrategy');
    const database = this.get('database');

    // Monitor Service
    const monitorService = new MonitorService(
      measurementRepository,
      monitoringStrategy,
      {
        intervalMs: this.config.intervalMs,
        logger: this.logger,
      }
    );
    this.instances.set('monitorService', monitorService);

    // Analytics Service
    const analyticsService = new AnalyticsService({
      dropThresholdMbps: this.config.speedDropThresholdMbps,
      dropPercent: this.config.speedDropPercent,
      fallbackIntervalMs: this.config.intervalMs,
    });
    this.instances.set('analyticsService', analyticsService);

    // Event Tracker Service
    const eventTrackerService = new EventTrackerService(
      eventRepository,
      measurementRepository,
      {
        speedDropThresholdMbps: this.config.speedDropThresholdMbps,
        speedDropPercent: this.config.speedDropPercent,
        speedImproveThresholdMbps: this.config.speedDropThresholdMbps,
        speedImprovePercent: this.config.speedDropPercent,
        logger: this.logger,
      }
    );
    await eventTrackerService.init();
    this.instances.set('eventTrackerService', eventTrackerService);

    // Archive Service
    const archiveService = new ArchiveService(
      measurementRepository,
      eventRepository,
      database,
      {
        historyDir: this.config.historyDir,
        logger: this.logger,
      }
    );
    await archiveService.init();
    this.instances.set('archiveService', archiveService);

    // Scheduler Service
    const schedulerService = new SchedulerService({
      logger: this.logger,
    });
    this.instances.set('schedulerService', schedulerService);

    // Wire event tracking to monitor
    monitorService.on('measurement', async (measurement) => {
      try {
        await eventTrackerService.analyzeMeasurement(measurement);
      } catch (error) {
        this.logger.error('[DIContainer] event analysis failed:', error);
      }
    });
  }

  /**
   * Creates controller instances
   */
  createControllers() {
    const monitorService = this.get('monitorService');
    const analyticsService = this.get('analyticsService');
    const eventTrackerService = this.get('eventTrackerService');
    const archiveService = this.get('archiveService');
    const database = this.get('database');

    // Health Controller
    const healthController = new HealthController(this.config);
    this.instances.set('healthController', healthController);

    // Metrics Controller
    const metricsController = new MetricsController(monitorService);
    this.instances.set('metricsController', metricsController);

    // Reports Controller
    const reportsController = new ReportsController(
      monitorService,
      analyticsService,
      this.config
    );
    this.instances.set('reportsController', reportsController);

    // Monitor Controller
    const monitorController = new MonitorController(monitorService);
    this.instances.set('monitorController', monitorController);

    // Archive Controller
    const archiveController = new ArchiveController(archiveService);
    this.instances.set('archiveController', archiveController);

    // Event Controller
    const eventController = new EventController(eventTrackerService);
    this.instances.set('eventController', eventController);

    // Statistics Controller
    const statisticsController = new StatisticsController(
      monitorService,
      eventTrackerService,
      analyticsService,
      database
    );
    this.instances.set('statisticsController', statisticsController);
  }

  /**
   * Gets an instance from the container
   * @param {string} name
   * @returns {*}
   */
  get(name) {
    if (!this.instances.has(name)) {
      throw new Error(`Service not found in container: ${name}`);
    }
    return this.instances.get(name);
  }

  /**
   * Checks if an instance exists
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.instances.has(name);
  }

  /**
   * Starts all services
   * @returns {Promise<void>}
   */
  async startServices() {
    const monitorService = this.get('monitorService');
    const schedulerService = this.get('schedulerService');
    const archiveService = this.get('archiveService');

    // Start monitoring
    await monitorService.start();

    // Schedule daily archive task
    if (this.config.archiveEnabled) {
      schedulerService.scheduleDailyTask(
        'daily-archive',
        async () => {
          this.logger.info('[DIContainer] running daily archive task');
          await archiveService.archiveMeasurements();
          await archiveService.archiveEvents();

          if (this.config.archiveRetentionDays > 0) {
            await archiveService.cleanOldArchives(this.config.archiveRetentionDays);
          }
        },
        this.config.archiveHour || 0,
        0,
        false
      );
      this.logger.info(
        `[DIContainer] daily archival scheduled at ${this.config.archiveHour}:00 (retention: ${this.config.archiveRetentionDays} days)`
      );
    }

    // Schedule daily database cleanup
    schedulerService.scheduleDailyTask(
      'daily-db-cleanup',
      async () => {
        this.logger.info('[DIContainer] running daily database cleanup task');
        try {
          const retentionMs = 24 * 60 * 60 * 1000; // 24 hours
          await archiveService.cleanupDatabase(retentionMs);
        } catch (error) {
          this.logger.error('[DIContainer] database cleanup failed:', error);
        }
      },
      this.config.archiveHour || 0,
      30, // Run 30 minutes after archive task
      false
    );
    this.logger.info(
      `[DIContainer] daily database cleanup scheduled at ${this.config.archiveHour}:30 (retention: 24 hours)`
    );
  }

  /**
   * Stops all services
   * @returns {Promise<void>}
   */
  async stopServices() {
    this.logger.info('[DIContainer] stopping services');

    const monitorService = this.get('monitorService');
    const schedulerService = this.get('schedulerService');
    const database = this.get('database');

    monitorService.stop();
    schedulerService.cancelAll();
    database.close();

    this.logger.info('[DIContainer] services stopped');
  }

  /**
   * Gets all services (for debugging)
   * @returns {Array<string>}
   */
  listServices() {
    return Array.from(this.instances.keys());
  }
}
