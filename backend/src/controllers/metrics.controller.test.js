import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatest, getRecent } from './metrics.controller.js';
import * as metricsService from '../services/metrics.service.js';

vi.mock('../services/metrics.service.js');

describe('metrics.controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('getLatest', () => {
    it('should return latest measurement', async () => {
      const mockMeasurement = {
        id: 1,
        timestamp: '2024-01-01T10:00:00Z',
        status: 'online',
        downloadMbps: 100,
      };

      vi.mocked(metricsService.getLatest).mockResolvedValue(mockMeasurement);

      await getLatest(req, res, next);

      expect(metricsService.getLatest).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockMeasurement);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if no measurements found', async () => {
      vi.mocked(metricsService.getLatest).mockResolvedValue(null);

      await getLatest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No measurements found' });
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      vi.mocked(metricsService.getLatest).mockRejectedValue(error);

      await getLatest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRecent', () => {
    it('should return recent measurements with default limit', async () => {
      const mockMeasurements = [
        { id: 1, timestamp: '2024-01-01T10:00:00Z', status: 'online' },
      ];

      vi.mocked(metricsService.getRecent).mockResolvedValue(mockMeasurements);

      await getRecent(req, res, next);

      expect(metricsService.getRecent).toHaveBeenCalledWith(50);
      expect(res.json).toHaveBeenCalledWith(mockMeasurements);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return recent measurements with custom limit', async () => {
      req.query.limit = '100';
      const mockMeasurements = [];

      vi.mocked(metricsService.getRecent).mockResolvedValue(mockMeasurements);

      await getRecent(req, res, next);

      expect(metricsService.getRecent).toHaveBeenCalledWith(100);
      expect(res.json).toHaveBeenCalledWith(mockMeasurements);
    });

    it('should handle non-numeric limit', async () => {
      req.query.limit = 'invalid';
      const mockMeasurements = [];

      vi.mocked(metricsService.getRecent).mockResolvedValue(mockMeasurements);

      await getRecent(req, res, next);

      expect(metricsService.getRecent).toHaveBeenCalledWith(50);
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      vi.mocked(metricsService.getRecent).mockRejectedValue(error);

      await getRecent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
