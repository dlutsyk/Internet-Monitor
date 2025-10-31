/**
 * Analytics Service
 * Handles computation of statistics and summaries
 *
 * SOLID Principles:
 * - SRP: Only responsible for analytics computations
 * - OCP: Can be extended with new analytics methods
 *
 * GRASP Principles:
 * - Information Expert: Has all data needed for analytics
 * - Pure Fabrication: Service created to encapsulate analytics logic
 * - High Cohesion: All methods related to data analysis
 */
export default class AnalyticsService {
  constructor(options = {}) {
    this.dropThresholdMbps = options.dropThresholdMbps || 15;
    this.dropPercent = options.dropPercent || 30;
    this.fallbackIntervalMs = options.fallbackIntervalMs || 60000;
    this.maxSpeedDropEvents = options.maxSpeedDropEvents || 50;
    this.maxRealisticDownloadMbps = options.maxRealisticDownloadMbps || 1000;
    this.maxRealisticUploadMbps = options.maxRealisticUploadMbps || 500;
  }

  /**
   * Fixes number to specified decimal places
   * @param {number} value
   * @param {number} digits
   * @returns {number|null}
   */
  toFixedNumber(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  /**
   * Computes summary statistics from measurements
   * @param {Array<Measurement>} measurements
   * @returns {Object}
   */
  computeSummary(measurements) {
    if (!measurements.length) {
      return {
        totalSamples: 0,
        onlineSamples: 0,
        offlineSamples: 0,
        uptimePercent: null,
        downtime: { events: 0, durationMs: 0 },
        download: { min: null, max: null, avg: null },
        upload: { min: null, max: null, avg: null },
        latency: { min: null, max: null, avg: null },
        speedDrops: { count: 0, events: [] },
      };
    }

    let lastOnlineDownload = null;
    let downloadSum = 0;
    let downloadCount = 0;
    let uploadSum = 0;
    let uploadCount = 0;
    let latencySum = 0;
    let latencyCount = 0;

    let downloadMin = null;
    let downloadMax = null;
    let uploadMin = null;
    let uploadMax = null;
    let latencyMin = null;
    let latencyMax = null;

    let offlineSamples = 0;
    let offlineEvents = 0;
    let totalDowntimeMs = 0;
    let previousWasOffline = false;

    const speedDropEvents = [];

    // Sort measurements by timestamp
    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const measurement of sortedMeasurements) {
      const isOnline = measurement.isOnline();
      const durationMs =
        Number(measurement.estimatedDowntimeMs) ||
        Number(measurement.durationSinceLastMs) ||
        this.fallbackIntervalMs;

      if (!isOnline) {
        offlineSamples += 1;
        totalDowntimeMs += durationMs;
        if (!previousWasOffline) {
          offlineEvents += 1;
        }
        previousWasOffline = true;
        continue;
      }

      previousWasOffline = false;

      const download = Number(measurement.downloadMbps);
      if (
        Number.isFinite(download) &&
        download > 0 &&
        download <= this.maxRealisticDownloadMbps
      ) {
        downloadSum += download;
        downloadCount += 1;
        downloadMin = downloadMin === null ? download : Math.min(downloadMin, download);
        downloadMax = downloadMax === null ? download : Math.max(downloadMax, download);

        if (lastOnlineDownload !== null) {
          const dropByMbps = lastOnlineDownload - download;
          const dropByPercent =
            lastOnlineDownload > 0 ? (dropByMbps / lastOnlineDownload) * 100 : 0;

          if (dropByMbps >= this.dropThresholdMbps || dropByPercent >= this.dropPercent) {
            if (speedDropEvents.length < this.maxSpeedDropEvents) {
              speedDropEvents.push({
                timestamp: measurement.timestamp,
                previousMbps: this.toFixedNumber(lastOnlineDownload),
                currentMbps: this.toFixedNumber(download),
                dropMbps: this.toFixedNumber(dropByMbps),
                dropPercent: this.toFixedNumber(dropByPercent),
              });
            }
          }
        }
        lastOnlineDownload = download;
      }

      const upload = Number(measurement.uploadMbps);
      if (
        Number.isFinite(upload) &&
        upload > 0 &&
        upload <= this.maxRealisticUploadMbps
      ) {
        uploadSum += upload;
        uploadCount += 1;
        uploadMin = uploadMin === null ? upload : Math.min(uploadMin, upload);
        uploadMax = uploadMax === null ? upload : Math.max(uploadMax, upload);
      }

      const latency = Number(measurement.latencyMs);
      if (Number.isFinite(latency)) {
        latencySum += latency;
        latencyCount += 1;
        latencyMin = latencyMin === null ? latency : Math.min(latencyMin, latency);
        latencyMax = latencyMax === null ? latency : Math.max(latencyMax, latency);
      }
    }

    const totalSamples = measurements.length;
    const onlineSamples = totalSamples - offlineSamples;
    const uptimePercent = totalSamples
      ? this.toFixedNumber((onlineSamples / totalSamples) * 100)
      : null;

    return {
      totalSamples,
      onlineSamples,
      offlineSamples,
      uptimePercent,
      downtime: {
        events: offlineEvents,
        durationMs: Math.round(totalDowntimeMs),
      },
      download: {
        min: downloadMin !== null ? this.toFixedNumber(downloadMin) : null,
        max: downloadMax !== null ? this.toFixedNumber(downloadMax) : null,
        avg: downloadCount ? this.toFixedNumber(downloadSum / downloadCount) : null,
      },
      upload: {
        min: uploadMin !== null ? this.toFixedNumber(uploadMin) : null,
        max: uploadMax !== null ? this.toFixedNumber(uploadMax) : null,
        avg: uploadCount ? this.toFixedNumber(uploadSum / uploadCount) : null,
      },
      latency: {
        min: latencyMin !== null ? this.toFixedNumber(latencyMin) : null,
        max: latencyMax !== null ? this.toFixedNumber(latencyMax) : null,
        avg: latencyCount ? this.toFixedNumber(latencySum / latencyCount) : null,
      },
      speedDrops: {
        count: speedDropEvents.length,
        events: speedDropEvents,
        thresholdMbps: this.dropThresholdMbps,
        thresholdPercent: this.dropPercent,
      },
    };
  }

  /**
   * Computes today's statistics
   * @param {Array<Measurement>} measurements
   * @returns {Object}
   */
  computeTodayStats(measurements) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const todayMeasurements = measurements.filter((m) => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= startOfToday;
    });

    const summary = this.computeSummary(todayMeasurements);

    return {
      disconnectionEvents: summary.downtime.events,
      offlineSamples: summary.offlineSamples,
      totalDowntimeMs: summary.downtime.durationMs,
      uptimePercent: summary.uptimePercent,
      date: startOfToday.toISOString(),
    };
  }

  /**
   * Computes uptime periods from measurements
   * @param {Array<Measurement>} measurements
   * @returns {Array<Object>}
   */
  computeUptimePeriods(measurements) {
    const uptimePeriods = [];
    let currentPeriod = null;

    const sorted = [...measurements].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const measurement of sorted) {
      if (measurement.isOnline()) {
        if (!currentPeriod) {
          currentPeriod = {
            start: measurement.timestamp,
            end: measurement.timestamp,
          };
        } else {
          currentPeriod.end = measurement.timestamp;
        }
      } else if (currentPeriod) {
        uptimePeriods.push(currentPeriod);
        currentPeriod = null;
      }
    }

    if (currentPeriod) {
      uptimePeriods.push(currentPeriod);
    }

    return uptimePeriods;
  }
}
