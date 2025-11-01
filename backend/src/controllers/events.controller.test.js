import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecent, getByDateRange } from './events.controller.js';
import * as eventsService from '../services/events.service.js';

vi.mock('../services/events.service.js');

describe('events.controller', () => {
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

  describe('getRecent', () => {
    it('should return recent events with default limit', async () => {
      const mockEvents = [
        { id: '1', type: 'outage_started', timestamp: '2024-01-01T10:00:00Z' },
      ];

      vi.mocked(eventsService.getRecent).mockResolvedValue(mockEvents);

      await getRecent(req, res, next);

      expect(eventsService.getRecent).toHaveBeenCalledWith(50);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return recent events with custom limit', async () => {
      req.query.limit = '100';
      const mockEvents = [];

      vi.mocked(eventsService.getRecent).mockResolvedValue(mockEvents);

      await getRecent(req, res, next);

      expect(eventsService.getRecent).toHaveBeenCalledWith(100);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should handle non-numeric limit', async () => {
      req.query.limit = 'invalid';
      const mockEvents = [];

      vi.mocked(eventsService.getRecent).mockResolvedValue(mockEvents);

      await getRecent(req, res, next);

      expect(eventsService.getRecent).toHaveBeenCalledWith(50);
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      vi.mocked(eventsService.getRecent).mockRejectedValue(error);

      await getRecent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getByDateRange', () => {
    it('should return events by date range', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const mockEvents = [
        { id: '1', type: 'outage_started', timestamp: '2024-01-01T10:00:00Z' },
      ];

      vi.mocked(eventsService.getByDateRange).mockResolvedValue(mockEvents);

      await getByDateRange(req, res, next);

      expect(eventsService.getByDateRange).toHaveBeenCalledWith(req.query.from, req.query.to);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if from parameter is missing', async () => {
      req.query = { to: '2024-01-02T00:00:00Z' };

      await getByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(eventsService.getByDateRange).not.toHaveBeenCalled();
    });

    it('should return 400 if to parameter is missing', async () => {
      req.query = { from: '2024-01-01T00:00:00Z' };

      await getByDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: from, to',
      });
      expect(eventsService.getByDateRange).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
      };

      const error = new Error('Service error');
      vi.mocked(eventsService.getByDateRange).mockRejectedValue(error);

      await getByDateRange(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
