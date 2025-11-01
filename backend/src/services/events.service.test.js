import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecent, getByDateRange, countByType } from './events.service.js';
import * as db from '../db.js';

vi.mock('../db.js');

describe('events.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecent', () => {
    it('should get recent events with default limit', async () => {
      const mockEvents = [
        { id: '1', type: 'outage_started', timestamp: '2024-01-01T10:00:00Z', metadata: '{"duration":5000}' },
        { id: '2', type: 'outage_ended', timestamp: '2024-01-01T10:05:00Z', metadata: null },
      ];

      vi.mocked(db.getRecentEvents).mockResolvedValue(mockEvents);

      const result = await getRecent();
      expect(db.getRecentEvents).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(2);
      expect(result[0].metadata).toEqual({ duration: 5000 });
      expect(result[1].metadata).toBeNull();
    });

    it('should get recent events with custom limit', async () => {
      const mockEvents = [
        { id: '1', type: 'outage_started', timestamp: '2024-01-01T10:00:00Z', metadata: null },
      ];

      vi.mocked(db.getRecentEvents).mockResolvedValue(mockEvents);

      await getRecent(10);
      expect(db.getRecentEvents).toHaveBeenCalledWith(10);
    });

    it('should parse JSON metadata correctly', async () => {
      const mockEvents = [
        {
          id: '1',
          type: 'speed_drop',
          timestamp: '2024-01-01T10:00:00Z',
          metadata: '{"from":100,"to":50}'
        },
      ];

      vi.mocked(db.getRecentEvents).mockResolvedValue(mockEvents);

      const result = await getRecent();
      expect(result[0].metadata).toEqual({ from: 100, to: 50 });
    });
  });

  describe('getByDateRange', () => {
    it('should get events by date range', async () => {
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-01-02T00:00:00Z';
      const mockEvents = [
        { id: '1', type: 'outage_started', timestamp: '2024-01-01T10:00:00Z', metadata: null },
      ];

      vi.mocked(db.getEventsByDateRange).mockResolvedValue(mockEvents);

      const result = await getByDateRange(fromDate, toDate);
      expect(db.getEventsByDateRange).toHaveBeenCalledWith(fromDate, toDate);
      expect(result).toHaveLength(1);
    });
  });

  describe('countByType', () => {
    it('should count events by type', () => {
      const events = [
        { type: 'outage_started' },
        { type: 'outage_ended' },
        { type: 'outage_started' },
        { type: 'speed_drop' },
        { type: 'outage_started' },
      ];

      const result = countByType(events);
      expect(result).toEqual({
        outage_started: 3,
        outage_ended: 1,
        speed_drop: 1,
      });
    });

    it('should return empty object for empty array', () => {
      const result = countByType([]);
      expect(result).toEqual({});
    });
  });
});
