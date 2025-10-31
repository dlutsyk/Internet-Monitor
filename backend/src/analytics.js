const toFixedNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const computeSummary = (records, options = {}) => {
  const {
    dropThresholdMbps = 15,
    dropPercent = 30,
    fallbackIntervalMs = 60_000,
    maxSpeedDropEvents = 50,
  } = options;

  if (!records.length) {
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

  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const record of sortedRecords) {
    const isOnline = record.status === 'online';
    const durationMs =
      Number(record.estimatedDowntimeMs) ||
      Number(record.durationSinceLastMs) ||
      fallbackIntervalMs;

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

    const download = Number(record.downloadMbps);
    if (Number.isFinite(download)) {
      downloadSum += download;
      downloadCount += 1;
      downloadMin = downloadMin === null ? download : Math.min(downloadMin, download);
      downloadMax = downloadMax === null ? download : Math.max(downloadMax, download);

      if (lastOnlineDownload !== null) {
        const dropByMbps = lastOnlineDownload - download;
        const dropByPercent =
          lastOnlineDownload > 0 ? (dropByMbps / lastOnlineDownload) * 100 : 0;
        if (dropByMbps >= dropThresholdMbps || dropByPercent >= dropPercent) {
          if (speedDropEvents.length < maxSpeedDropEvents) {
            speedDropEvents.push({
              timestamp: record.timestamp,
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

    const upload = Number(record.uploadMbps);
    if (Number.isFinite(upload)) {
      uploadSum += upload;
      uploadCount += 1;
      uploadMin = uploadMin === null ? upload : Math.min(uploadMin, upload);
      uploadMax = uploadMax === null ? upload : Math.max(uploadMax, upload);
    }

    const latency = Number(record.latencyMs);
    if (Number.isFinite(latency)) {
      latencySum += latency;
      latencyCount += 1;
      latencyMin = latencyMin === null ? latency : Math.min(latencyMin, latency);
      latencyMax = latencyMax === null ? latency : Math.max(latencyMax, latency);
    }
  }

  const totalSamples = records.length;
  const onlineSamples = totalSamples - offlineSamples;
  const uptimePercent = totalSamples
    ? toFixedNumber((onlineSamples / totalSamples) * 100)
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
      min: downloadMin !== null ? toFixedNumber(downloadMin) : null,
      max: downloadMax !== null ? toFixedNumber(downloadMax) : null,
      avg: downloadCount ? toFixedNumber(downloadSum / downloadCount) : null,
    },
    upload: {
      min: uploadMin !== null ? toFixedNumber(uploadMin) : null,
      max: uploadMax !== null ? toFixedNumber(uploadMax) : null,
      avg: uploadCount ? toFixedNumber(uploadSum / uploadCount) : null,
    },
    latency: {
      min: latencyMin !== null ? toFixedNumber(latencyMin) : null,
      max: latencyMax !== null ? toFixedNumber(latencyMax) : null,
      avg: latencyCount ? toFixedNumber(latencySum / latencyCount) : null,
    },
    speedDrops: {
      count: speedDropEvents.length,
      events: speedDropEvents,
      thresholdMbps: dropThresholdMbps,
      thresholdPercent: dropPercent,
    },
  };
};
