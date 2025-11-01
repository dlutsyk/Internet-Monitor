import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseStats, cleanupDatabase, getDetailedStatistics } from './statistics.service.js';
import * as db from '../db.js';
import * as metricsService from './metrics.service.js';
import * as eventsService from './events.service.js';
import * as analytics from '../analytics.js';

vi.mock('../db.js');
vi.mock('./metrics.service.js');
vi.mock('./events.service.js');
vi.mock('../analytics.js');

describe('statistics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDatabaseStats', () => {
    it('should get database statistics', async () => {
      const mockStats = {
        measurementCount: 100,
        eventCount: 20,
        oldestTimestamp: '2024-01-01T00:00:00Z',
        newestTimestamp: '2024-01-02T00:00:00Z',
      };

      vi.mocked(db.getDatabaseStats).mockResolvedValue(mockStats);

      const result = await getDatabaseStats();
      expect(db.getDatabaseStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('cleanupDatabase', () => {
    it('should clean up old data and vacuum', async () => {
      const retentionHours = 168; // 7 days
      const mockDate = new Date('2024-01-08T00:00:00Z');
      vi.setSystemTime(mockDate);

      vi.mocked(db.deleteMeasurementsOlderThan).mockResolvedValue(50);
      vi.mocked(db.deleteEventsOlderThan).mockResolvedValue(10);
      vi.mocked(db.vacuum).mockResolvedValue(undefined);

      const result = await cleanupDatabase(retentionHours);

      expect(db.deleteMeasurementsOlderThan).toHaveBeenCalled();
      expect(db.deleteEventsOlderThan).toHaveBeenCalled();
      expect(db.vacuum).toHaveBeenCalled();
      expect(result.deletedMeasurements).toBe(50);
      expect(result.deletedEvents).toBe(10);
      expect(result.cutoffDate).toBeTruthy();
    });

    it('should calculate cutoff date correctly', async () => {
      const retentionHours = 24;
      const mockDate = new Date('2024-01-02T12:00:00Z');
      vi.setSystemTime(mockDate);

      vi.mocked(db.deleteMeasurementsOlderThan).mockResolvedValue(0);
      vi.mocked(db.deleteEventsOlderThan).mockResolvedValue(0);
      vi.mocked(db.vacuum).mockResolvedValue(undefined);

      const result = await cleanupDatabase(retentionHours);

      const cutoffDate = new Date(result.cutoffDate);
      const expectedCutoff = new Date('2024-01-01T12:00:00Z');
      expect(cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });
  });

  describe('getDetailedStatistics', () => {
    it('should get detailed statistics for a period', async () => {
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-01-02T00:00:00Z';
      const mockConfig = { intervalMs: 60000 };

      const mockMeasurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100 },
      ];
      const mockEvents = [
        { type: 'outage_started', timestamp: '2024-01-01T10:30:00Z' },
        { type: 'outage_ended', timestamp: '2024-01-01T10:35:00Z' },
      ];
      const mockDbStats = {
        measurementCount: 100,
        eventCount: 20,
      };
      const mockSummary = {
        totalSamples: 1,
        onlineSamples: 1,
        uptimePercent: 100,
      };
      const mockEventsByType = {
        outage_started: 1,
        outage_ended: 1,
      };

      vi.mocked(metricsService.getByDateRange).mockResolvedValue(mockMeasurements);
      vi.mocked(eventsService.getByDateRange).mockResolvedValue(mockEvents);
      vi.mocked(db.getDatabaseStats).mockResolvedValue(mockDbStats);
      vi.mocked(analytics.computeSummary).mockReturnValue(mockSummary);
      vi.mocked(eventsService.countByType).mockReturnValue(mockEventsByType);

      const result = await getDetailedStatistics(fromDate, toDate, mockConfig);

      expect(metricsService.getByDateRange).toHaveBeenCalledWith(fromDate, toDate);
      expect(eventsService.getByDateRange).toHaveBeenCalledWith(fromDate, toDate);
      expect(db.getDatabaseStats).toHaveBeenCalled();
      expect(analytics.computeSummary).toHaveBeenCalledWith(mockMeasurements, mockConfig);
      expect(eventsService.countByType).toHaveBeenCalledWith(mockEvents);

      expect(result).toEqual({
        period: { from: fromDate, to: toDate },
        summary: mockSummary,
        events: {
          total: 2,
          byType: mockEventsByType,
        },
        database: mockDbStats,
      });
    });
  });
});
