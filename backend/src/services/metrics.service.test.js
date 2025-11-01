import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLatest, getRecent, getByDateRange } from './metrics.service.js';
import * as db from '../db.js';

vi.mock('../db.js');

describe('metrics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatest', () => {
    it('should get latest measurement and parse JSON fields', async () => {
      const mockMeasurement = {
        id: 1,
        timestamp: '2024-01-01T10:00:00Z',
        status: 'online',
        downloadMbps: 100,
        uploadMbps: 50,
        latencyMs: 20,
        error: null,
        meta: '{"test":"value"}',
        server: '{"host":"test.com"}',
        client: '{"ip":"1.2.3.4"}',
      };

      vi.mocked(db.getLatestMeasurement).mockResolvedValue(mockMeasurement);

      const result = await getLatest();
      expect(db.getLatestMeasurement).toHaveBeenCalled();
      expect(result.meta).toEqual({ test: 'value' });
      expect(result.server).toEqual({ host: 'test.com' });
      expect(result.client).toEqual({ ip: '1.2.3.4' });
      expect(result.error).toBeNull();
    });

    it('should return null for null measurement', async () => {
      vi.mocked(db.getLatestMeasurement).mockResolvedValue(null);

      const result = await getLatest();
      expect(result).toBeNull();
    });
  });

  describe('getRecent', () => {
    it('should get recent measurements with default limit', async () => {
      const mockMeasurements = [
        {
          id: 1,
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
          error: null,
          meta: null,
          server: null,
          client: null,
        },
        {
          id: 2,
          timestamp: '2024-01-01T10:01:00Z',
          status: 'online',
          downloadMbps: 110,
          error: null,
          meta: null,
          server: null,
          client: null,
        },
      ];

      vi.mocked(db.getRecentMeasurements).mockResolvedValue(mockMeasurements);

      const result = await getRecent();
      expect(db.getRecentMeasurements).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(2);
    });

    it('should get recent measurements with custom limit', async () => {
      vi.mocked(db.getRecentMeasurements).mockResolvedValue([]);

      await getRecent(10);
      expect(db.getRecentMeasurements).toHaveBeenCalledWith(10);
    });

    it('should parse JSON fields for all measurements', async () => {
      const mockMeasurements = [
        {
          id: 1,
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          error: '{"code":"TEST"}',
          meta: '{"foo":"bar"}',
          server: '{"name":"server1"}',
          client: '{"id":"client1"}',
        },
      ];

      vi.mocked(db.getRecentMeasurements).mockResolvedValue(mockMeasurements);

      const result = await getRecent();
      expect(result[0].error).toEqual({ code: 'TEST' });
      expect(result[0].meta).toEqual({ foo: 'bar' });
      expect(result[0].server).toEqual({ name: 'server1' });
      expect(result[0].client).toEqual({ id: 'client1' });
    });
  });

  describe('getByDateRange', () => {
    it('should get measurements by date range', async () => {
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-01-02T00:00:00Z';
      const mockMeasurements = [
        {
          id: 1,
          timestamp: '2024-01-01T10:00:00Z',
          status: 'online',
          downloadMbps: 100,
          error: null,
          meta: null,
          server: null,
          client: null,
        },
      ];

      vi.mocked(db.getMeasurementsByDateRange).mockResolvedValue(mockMeasurements);

      const result = await getByDateRange(fromDate, toDate);
      expect(db.getMeasurementsByDateRange).toHaveBeenCalledWith(fromDate, toDate);
      expect(result).toHaveLength(1);
    });
  });
});
