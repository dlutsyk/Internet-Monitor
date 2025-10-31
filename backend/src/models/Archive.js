/**
 * Archive Domain Model
 * Represents an archived measurements or events file
 *
 * Design Patterns Applied:
 * - Value Object (immutable after creation)
 *
 * SOLID Principles:
 * - SRP: Only responsible for representing an archive
 */
export default class Archive {
  constructor({ filename, path, date, size, type = 'measurements' }) {
    this.filename = filename;
    this.path = path;
    this.date = date;
    this.size = size;
    this.type = type; // 'measurements' or 'events'

    this.validate();
  }

  /**
   * Validates the archive data
   * @throws {Error} if validation fails
   */
  validate() {
    if (!this.filename) {
      throw new Error('Archive must have a filename');
    }

    if (!this.path) {
      throw new Error('Archive must have a path');
    }

    if (!this.date) {
      throw new Error('Archive must have a date');
    }

    if (this.size === null || this.size === undefined) {
      throw new Error('Archive must have a size');
    }

    if (!['measurements', 'events'].includes(this.type)) {
      throw new Error('Archive type must be either "measurements" or "events"');
    }
  }

  /**
   * Gets the archive size in a human-readable format
   * @returns {string}
   */
  getHumanReadableSize() {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Checks if the archive is older than a given number of days
   * @param {number} days
   * @returns {boolean}
   */
  isOlderThan(days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return new Date(this.date) < cutoffDate;
  }

  /**
   * Checks if this is a measurements archive
   * @returns {boolean}
   */
  isMeasurementsArchive() {
    return this.type === 'measurements';
  }

  /**
   * Checks if this is an events archive
   * @returns {boolean}
   */
  isEventsArchive() {
    return this.type === 'events';
  }

  /**
   * Converts the archive to a plain object for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      filename: this.filename,
      path: this.path,
      date: this.date,
      size: this.size,
      humanReadableSize: this.getHumanReadableSize(),
      type: this.type,
    };
  }

  /**
   * Factory method to create an Archive from file stats
   * @param {string} filename
   * @param {string} path
   * @param {Date} date
   * @param {number} size
   * @returns {Archive}
   */
  static fromFileStats(filename, path, date, size) {
    const type = filename.startsWith('events_') ? 'events' : 'measurements';
    return new Archive({ filename, path, date, size, type });
  }
}
