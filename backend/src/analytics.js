/**
 * Analytics functions for computing statistics
 */

function toFixedNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isOnline(measurement) {
  return measurement.status === 'online';
}

/**
 * Compute summary statistics from measurements
 */
export function computeSummary(measurements, config = {}) {
  const dropThresholdMbps = config.speedDropThresholdMbps || 15;
  const dropPercent = config.speedDropPercent || 30;
  const fallbackIntervalMs = config.intervalMs || 60000;
  const maxRealisticDownload = 1000;
  const maxRealisticUpload = 500;

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
    const online = isOnline(measurement);
    const durationMs =
      Number(measurement.estimatedDowntimeMs) ||
      Number(measurement.durationSinceLastMs) ||
      fallbackIntervalMs;

    if (!online) {
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
    if (Number.isFinite(download) && download > 0 && download <= maxRealisticDownload) {
      downloadSum += download;
      downloadCount += 1;
      downloadMin = downloadMin === null ? download : Math.min(downloadMin, download);
      downloadMax = downloadMax === null ? download : Math.max(downloadMax, download);

      if (lastOnlineDownload !== null) {
        const dropByMbps = lastOnlineDownload - download;
        const dropByPercent = lastOnlineDownload > 0 ? (dropByMbps / lastOnlineDownload) * 100 : 0;

        if (dropByMbps >= dropThresholdMbps || dropByPercent >= dropPercent) {
          if (speedDropEvents.length < 50) {
            speedDropEvents.push({
              timestamp: measurement.timestamp,
              previousMbps: toFixedNumber(lastOnlineDownload),
              currentMbps: toFixedNumber(download),
              dropMbps: toFixedNumber(dropByMbps),
              dropPercent: toFixedNumber(dropByPercent),
            });
          }
        }
      }
      lastOnlineDownload = download;
    }

    const upload = Number(measurement.uploadMbps);
    if (Number.isFinite(upload) && upload > 0 && upload <= maxRealisticUpload) {
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
  const uptimePercent = totalSamples > 0 ? toFixedNumber((onlineSamples / totalSamples) * 100) : null;

  return {
    totalSamples,
    onlineSamples,
    offlineSamples,
    uptimePercent,
    downtime: {
      events: offlineEvents,
      durationMs: totalDowntimeMs,
    },
    download: {
      min: toFixedNumber(downloadMin),
      max: toFixedNumber(downloadMax),
      avg: downloadCount > 0 ? toFixedNumber(downloadSum / downloadCount) : null,
    },
    upload: {
      min: toFixedNumber(uploadMin),
      max: toFixedNumber(uploadMax),
      avg: uploadCount > 0 ? toFixedNumber(uploadSum / uploadCount) : null,
    },
    latency: {
      min: toFixedNumber(latencyMin),
      max: toFixedNumber(latencyMax),
      avg: latencyCount > 0 ? toFixedNumber(latencySum / latencyCount) : null,
    },
    speedDrops: {
      count: speedDropEvents.length,
      events: speedDropEvents,
    },
  };
}

/**
 * Get today's date range
 */
export function getTodayDateRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return {
    from: startOfDay.toISOString(),
    to: endOfDay.toISOString(),
  };
}
