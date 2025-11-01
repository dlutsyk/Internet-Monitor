import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseStats, cleanupDatabase, getDetailedStatistics } from './statistics.controller.js';
import * as statisticsService from '../services/statistics.service.js';

vi.mock('../services/statistics.service.js');

describe('statistics.controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      config: {
        retentionHours: 168,
      },
      query: {},
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      const mockStats = {
        measurementCount: 100,
        eventCount: 20,
      };

      vi.mocked(statisticsService.getDatabaseStats).mockResolvedValue(mockStats);

      await getDatabaseStats(req, res, next);

      expect(statisticsService.getDatabaseStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockStats);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      vi.mocked(statisticsService.getDatabaseStats).mockRejectedValue(error);

      await getDatabaseStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cleanupDatabase', () => {
    it('should cleanup database using retention hours from config', async () => {
      const mockResult = {
        deletedMeasurements: 50,
        deletedEvents: 10,
        cutoffDate: '2024-01-01T00:00:00Z',
      };

      vi.mocked(statisticsService.cleanupDatabase).mockResolvedValue(mockResult);

      await cleanupDatabase(req, res, next);

      expect(statisticsService.cleanupDatabase).toHaveBeenCalledWith(168);
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Cleanup error');
      vi.mocked(statisticsService.cleanupDatabase).mockRejectedValue(error);

      await cleanupDatabase(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getDetailedStatistics', () => {
    it('should return detailed statistics for date range', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const mockStats = {
        period: { from: req.query.from, to: req.query.to },
        summary: { totalSamples: 100 },
        events: { total: 10 },
      };

      vi.mocked(statisticsService.getDetailedStatistics).mockResolvedValue(mockStats);

      await getDetailedStatistics(req, res, next);

      expect(statisticsService.getDetailedStatistics).toHaveBeenCalledWith(
        req.query.from,
        req.query.to,
        req.config
      );
      expect(res.json).toHaveBeenCalledWith(mockStats);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if from parameter is missing', async () => {
      req.query = { to: '2024-01-02T00:00:00Z' };

      await getDetailedStatistics(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(statisticsService.getDetailedStatistics).not.toHaveBeenCalled();
    });

    it('should return 400 if to parameter is missing', async () => {
      req.query = { from: '2024-01-01T00:00:00Z' };

      await getDetailedStatistics(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(statisticsService.getDetailedStatistics).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const error = new Error('Statistics error');
      vi.mocked(statisticsService.getDetailedStatistics).mockRejectedValue(error);

      await getDetailedStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
