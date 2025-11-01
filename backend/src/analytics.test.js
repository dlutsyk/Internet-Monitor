import { describe, it, expect, beforeEach } from 'vitest';
import { computeSummary, getTodayDateRange } from './analytics.js';

describe('analytics module', () => {
  describe('computeSummary', () => {
    it('should return empty summary for no measurements', () => {
      const result = computeSummary([]);
      expect(result.totalSamples).toBe(0);
      expect(result.onlineSamples).toBe(0);
      expect(result.offlineSamples).toBe(0);
      expect(result.uptimePercent).toBeNull();
      expect(result.download.min).toBeNull();
      expect(result.download.max).toBeNull();
      expect(result.download.avg).toBeNull();
    });

    it('should compute statistics for online measurements', () => {
      const measurements = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
          uploadMbps: 50,
          latencyMs: 20,
        },
        {
          timestamp: '2024-01-01T10:01:00Z',
          status: 'online',
          downloadMbps: 120,
          uploadMbps: 60,
          latencyMs: 25,
        },
        {
          timestamp: '2024-01-01T10:02:00Z',
          status: 'online',
          downloadMbps: 110,
          uploadMbps: 55,
          latencyMs: 22,
        },
      ];

      const result = computeSummary(measurements);
      expect(result.totalSamples).toBe(3);
      expect(result.onlineSamples).toBe(3);
      expect(result.offlineSamples).toBe(0);
      expect(result.uptimePercent).toBe(100);
      expect(result.download.min).toBe(100);
      expect(result.download.max).toBe(120);
      expect(result.download.avg).toBe(110);
      expect(result.upload.min).toBe(50);
      expect(result.upload.max).toBe(60);
      expect(result.upload.avg).toBe(55);
      expect(result.latency.min).toBe(20);
      expect(result.latency.max).toBe(25);
      expect(result.latency.avg).toBe(22.33);
    });

    it('should compute statistics for mixed online/offline measurements', () => {
      const measurements = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
          uploadMbps: 50,
          latencyMs: 20,
        },
        {
          timestamp: '2024-01-01T10:01:00Z',
          status: 'offline',
          estimatedDowntimeMs: 60000,
        },
        {
          timestamp: '2024-01-01T10:02:00Z',
          status: 'online',
          downloadMbps: 110,
          uploadMbps: 55,
          latencyMs: 22,
        },
      ];

      const result = computeSummary(measurements);
      expect(result.totalSamples).toBe(3);
      expect(result.onlineSamples).toBe(2);
      expect(result.offlineSamples).toBe(1);
      expect(result.uptimePercent).toBe(66.67);
      expect(result.downtime.events).toBe(1);
      expect(result.downtime.durationMs).toBe(60000);
    });

    it('should detect speed drops by absolute threshold', () => {
      const measurements = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
        },
        {
          timestamp: '2024-01-01T10:01:00Z',
          status: 'online',
          downloadMbps: 80,
        },
      ];

      const config = {
        speedDropThresholdMbps: 15,
        speedDropPercent: 30,
      };

      const result = computeSummary(measurements, config);
      expect(result.speedDrops.count).toBe(1);
      expect(result.speedDrops.events[0].dropMbps).toBe(20);
    });

    it('should detect speed drops by percentage threshold', () => {
      const measurements = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
        },
        {
          timestamp: '2024-01-01T10:01:00Z',
          status: 'online',
          downloadMbps: 60,
        },
      ];

      const config = {
        speedDropThresholdMbps: 15,
        speedDropPercent: 30,
      };

      const result = computeSummary(measurements, config);
      expect(result.speedDrops.count).toBe(1);
      expect(result.speedDrops.events[0].dropPercent).toBe(40);
    });

    it('should count multiple offline events correctly', () => {
      const measurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100 },
        { timestamp: '2024-01-01T10:01:00Z', status: 'offline', estimatedDowntimeMs: 60000 },
        { timestamp: '2024-01-01T10:02:00Z', status: 'offline', estimatedDowntimeMs: 60000 },
        { timestamp: '2024-01-01T10:03:00Z', status: 'online', downloadMbps: 100 },
        { timestamp: '2024-01-01T10:04:00Z', status: 'offline', estimatedDowntimeMs: 60000 },
      ];

      const result = computeSummary(measurements);
      expect(result.downtime.events).toBe(2);
      expect(result.downtime.durationMs).toBe(180000);
    });

    it('should filter out unrealistic speed values', () => {
      const measurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100, uploadMbps: 50 },
        { timestamp: '2024-01-01T10:01:00Z', status: 'online', downloadMbps: 2000, uploadMbps: 1000 }, // unrealistic
        { timestamp: '2024-01-01T10:02:00Z', status: 'online', downloadMbps: 110, uploadMbps: 55 },
      ];

      const result = computeSummary(measurements);
      expect(result.download.avg).toBe(105);
      expect(result.upload.avg).toBe(52.5);
    });

    it('should handle null and NaN values gracefully', () => {
      const measurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: null },
        { timestamp: '2024-01-01T10:01:00Z', status: 'online', downloadMbps: NaN },
        { timestamp: '2024-01-01T10:02:00Z', status: 'online', downloadMbps: 100 },
      ];

      const result = computeSummary(measurements);
      expect(result.download.avg).toBe(100);
      expect(result.download.min).toBe(100);
      expect(result.download.max).toBe(100);
    });

    it('should limit speed drop events to 50', () => {
      const measurements = [];
      for (let i = 0; i < 100; i++) {
        measurements.push({
          timestamp: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
          status: 'online',
          downloadMbps: i % 2 === 0 ? 100 : 50,
        });
      }

      const config = {
        speedDropThresholdMbps: 15,
        speedDropPercent: 30,
      };

      const result = computeSummary(measurements, config);
      expect(result.speedDrops.count).toBe(50);
      expect(result.speedDrops.events.length).toBe(50);
    });

    it('should sort measurements by timestamp', () => {
      const measurements = [
        { timestamp: '2024-01-01T10:02:00Z', status: 'online', downloadMbps: 110 },
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100 },
        { timestamp: '2024-01-01T10:01:00Z', status: 'online', downloadMbps: 105 },
      ];

      const result = computeSummary(measurements);
      expect(result.download.min).toBe(100);
      expect(result.download.max).toBe(110);
    });
  });

  describe('getTodayDateRange', () => {
    it('should return start and end of today', () => {
      const result = getTodayDateRange();
      const from = new Date(result.from);
      const to = new Date(result.to);

      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(from.getSeconds()).toBe(0);

      expect(to.getHours()).toBe(23);
      expect(to.getMinutes()).toBe(59);
      expect(to.getSeconds()).toBe(59);

      expect(from.toDateString()).toBe(new Date().toDateString());
      expect(to.toDateString()).toBe(new Date().toDateString());
    });

    it('should return ISO string dates', () => {
      const result = getTodayDateRange();
      expect(typeof result.from).toBe('string');
      expect(typeof result.to).toBe('string');
      expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
