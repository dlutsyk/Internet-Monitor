import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerMeasurement } from './monitor.controller.js';
import * as monitor from '../monitor.js';

vi.mock('../monitor.js');

describe('monitor.controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {};
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('triggerMeasurement', () => {
    it('should trigger measurement and return result', async () => {
      const mockMeasurement = {
        timestamp: '2024-01-01T10:00:00Z',
        status: 'online',
        downloadMbps: 100,
        uploadMbps: 50,
        error: null,
        meta: '{"test":"value"}',
        server: '{"host":"test.com"}',
        client: '{"ip":"1.2.3.4"}',
      };

      vi.mocked(monitor.performMeasurement).mockResolvedValue(mockMeasurement);

      await triggerMeasurement(req, res, next);

      expect(monitor.performMeasurement).toHaveBeenCalledWith({ force: true });
      expect(res.json).toHaveBeenCalledWith({
        ...mockMeasurement,
        error: null,
        meta: { test: 'value' },
        server: { host: 'test.com' },
        client: { ip: '1.2.3.4' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle null JSON fields', async () => {
      const mockMeasurement = {
        timestamp: '2024-01-01T10:00:00Z',
        status: 'online',
        error: null,
        meta: null,
        server: null,
        client: null,
      };

      vi.mocked(monitor.performMeasurement).mockResolvedValue(mockMeasurement);

      await triggerMeasurement(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        ...mockMeasurement,
        error: null,
        meta: null,
        server: null,
        client: null,
      });
    });

    it('should return 500 if measurement returns null', async () => {
      vi.mocked(monitor.performMeasurement).mockResolvedValue(null);

      await triggerMeasurement(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to perform measurement',
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Measurement error');
      vi.mocked(monitor.performMeasurement).mockRejectedValue(error);

      await triggerMeasurement(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
