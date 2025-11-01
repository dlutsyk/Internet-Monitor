import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getToday, getReport } from './reports.controller.js';
import * as reportsService from '../services/reports.service.js';

vi.mock('../services/reports.service.js');

describe('reports.controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      config: {
        intervalMs: 60000,
      },
      query: {},
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('getToday', () => {
    it('should return today\'s report', async () => {
      const mockReport = {
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-01T23:59:59.999Z',
        summary: { totalSamples: 100 },
        measurements: [],
      };

      vi.mocked(reportsService.generateTodayReport).mockResolvedValue(mockReport);

      await getToday(req, res, next);

      expect(reportsService.generateTodayReport).toHaveBeenCalledWith(req.config);
      expect(res.json).toHaveBeenCalledWith(mockReport);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Report error');
      vi.mocked(reportsService.generateTodayReport).mockRejectedValue(error);

      await getToday(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getReport', () => {
    it('should return report for date range', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const mockReport = {
        from: req.query.from,
        to: req.query.to,
        summary: { totalSamples: 100 },
        measurements: [],
      };

      vi.mocked(reportsService.generateReport).mockResolvedValue(mockReport);

      await getReport(req, res, next);

      expect(reportsService.generateReport).toHaveBeenCalledWith(
        req.query.from,
        req.query.to,
        req.config
      );
      expect(res.json).toHaveBeenCalledWith(mockReport);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if from parameter is missing', async () => {
      req.query = { to: '2024-01-02T00:00:00Z' };

      await getReport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(reportsService.generateReport).not.toHaveBeenCalled();
    });

    it('should return 400 if to parameter is missing', async () => {
      req.query = { from: '2024-01-01T00:00:00Z' };

      await getReport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(reportsService.generateReport).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const error = new Error('Report error');
      vi.mocked(reportsService.generateReport).mockRejectedValue(error);

      await getReport(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
