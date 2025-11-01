import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealth, getConfig } from './health.controller.js';
import * as monitor from '../monitor.js';

vi.mock('../monitor.js');

describe('health.controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      config: {
        intervalMs: 60000,
        retentionHours: 168,
        speedDropThresholdMbps: 15,
        speedDropPercent: 30,
        simulationMode: false,
      },
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('getHealth', () => {
    it('should return health status with monitoring info', () => {
      const mockStatus = {
        isRunning: true,
        lastRunAt: Date.now(),
      };

      vi.mocked(monitor.getStatus).mockReturnValue(mockStatus);

      getHealth(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          uptime: expect.any(Number),
          monitoring: {
            running: true,
            lastRun: expect.any(String),
          },
        })
      );
    });

    it('should return null lastRun when never run', () => {
      const mockStatus = {
        isRunning: false,
        lastRunAt: null,
      };

      vi.mocked(monitor.getStatus).mockReturnValue(mockStatus);

      getHealth(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          monitoring: {
            running: false,
            lastRun: null,
          },
        })
      );
    });
  });

  describe('getConfig', () => {
    it('should return configuration', () => {
      getConfig(req, res);

      expect(res.json).toHaveBeenCalledWith({
        intervalMs: 60000,
        retentionHours: 168,
        speedDropThresholdMbps: 15,
        speedDropPercent: 30,
        simulationMode: false,
      });
    });
  });
});
