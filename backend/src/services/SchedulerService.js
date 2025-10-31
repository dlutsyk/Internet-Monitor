/**
 * Scheduler Service
 * Handles scheduling of recurring tasks
 *
 * SOLID Principles:
 * - SRP: Only responsible for task scheduling
 * - OCP: Can be extended with new scheduling strategies
 *
 * GRASP Principles:
 * - Pure Fabrication: Service created to handle scheduling concerns
 * - Low Coupling: Independent of other domain services
 * - High Cohesion: All methods related to scheduling
 */
export default class SchedulerService {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.timers = new Map();
  }

  /**
   * Calculates milliseconds until the next occurrence of a specific time
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   * @returns {number} Milliseconds until next occurrence
   */
  getMillisecondsUntilTime(hour, minute = 0) {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If target time has already passed today, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }

  /**
   * Schedules a task to run daily at a specific time
   * @param {string} name - Unique name for this scheduled task
   * @param {Function} task - Async function to execute
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   * @param {boolean} runImmediately - Whether to run the task immediately on start
   */
  scheduleDailyTask(name, task, hour = 0, minute = 0, runImmediately = false) {
    // Clear existing timer if any
    this.cancelTask(name);

    const scheduleNext = () => {
      const msUntilNext = this.getMillisecondsUntilTime(hour, minute);
      const nextRun = new Date(Date.now() + msUntilNext);

      this.logger.info(
        `[SchedulerService] task "${name}" scheduled for ${nextRun.toLocaleString()}`
      );

      const timer = setTimeout(async () => {
        try {
          this.logger.info(`[SchedulerService] running task "${name}"`);
          await task();
          this.logger.info(`[SchedulerService] task "${name}" completed`);
        } catch (error) {
          this.logger.error(`[SchedulerService] task "${name}" failed:`, error);
        }

        // Schedule the next run
        scheduleNext();
      }, msUntilNext);

      this.timers.set(name, timer);
    };

    // Run immediately if requested
    if (runImmediately) {
      task().catch((error) => {
        this.logger.error(`[SchedulerService] immediate run of task "${name}" failed:`, error);
      });
    }

    // Schedule the first run
    scheduleNext();
  }

  /**
   * Schedules a task to run periodically
   * @param {string} name - Unique name for this scheduled task
   * @param {Function} task - Async function to execute
   * @param {number} intervalMs - Interval in milliseconds
   * @param {boolean} runImmediately - Whether to run the task immediately on start
   */
  schedulePeriodicTask(name, task, intervalMs, runImmediately = false) {
    // Clear existing timer if any
    this.cancelTask(name);

    this.logger.info(`[SchedulerService] scheduling periodic task "${name}" (interval: ${intervalMs}ms)`);

    // Run immediately if requested
    if (runImmediately) {
      task().catch((error) => {
        this.logger.error(`[SchedulerService] immediate run of task "${name}" failed:`, error);
      });
    }

    // Schedule periodic execution
    const timer = setInterval(async () => {
      try {
        this.logger.info(`[SchedulerService] running task "${name}"`);
        await task();
        this.logger.info(`[SchedulerService] task "${name}" completed`);
      } catch (error) {
        this.logger.error(`[SchedulerService] task "${name}" failed:`, error);
      }
    }, intervalMs);

    this.timers.set(name, timer);
  }

  /**
   * Cancels a scheduled task
   * @param {string} name - Name of the task to cancel
   */
  cancelTask(name) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(name);
      this.logger.info(`[SchedulerService] cancelled task "${name}"`);
    }
  }

  /**
   * Cancels all scheduled tasks
   */
  cancelAll() {
    for (const [name, timer] of this.timers.entries()) {
      clearTimeout(timer);
      clearInterval(timer);
      this.logger.info(`[SchedulerService] cancelled task "${name}"`);
    }
    this.timers.clear();
  }

  /**
   * Gets all scheduled task names
   * @returns {Array<string>}
   */
  getScheduledTasks() {
    return Array.from(this.timers.keys());
  }

  /**
   * Checks if a task is scheduled
   * @param {string} name
   * @returns {boolean}
   */
  isTaskScheduled(name) {
    return this.timers.has(name);
  }
}
