import { describe, it, expect } from 'vitest';
import config from './config.js';

describe('config module', () => {
  describe('default configuration', () => {
    it('should have port configured', () => {
      expect(config.port).toBeDefined();
      expect(typeof config.port).toBe('number');
    });

    it('should have host configured', () => {
      expect(config.host).toBeDefined();
      expect(typeof config.host).toBe('string');
    });

    it('should have intervalMs configured', () => {
      expect(config.intervalMs).toBeDefined();
      expect(typeof config.intervalMs).toBe('number');
      expect(config.intervalMs).toBeGreaterThan(0);
    });

    it('should have wsPath configured', () => {
      expect(config.wsPath).toBeDefined();
      expect(typeof config.wsPath).toBe('string');
    });

    it('should have httpLogging configured', () => {
      expect(config.httpLogging).toBeDefined();
      expect(typeof config.httpLogging).toBe('boolean');
    });

    it('should have simulationMode configured', () => {
      expect(config.simulationMode).toBeDefined();
      expect(typeof config.simulationMode).toBe('boolean');
    });

    it('should have archiveEnabled configured', () => {
      expect(config.archiveEnabled).toBeDefined();
      expect(typeof config.archiveEnabled).toBe('boolean');
    });

    it('should have speedDropThresholdMbps configured', () => {
      expect(config.speedDropThresholdMbps).toBeDefined();
      expect(typeof config.speedDropThresholdMbps).toBe('number');
      expect(config.speedDropThresholdMbps).toBeGreaterThan(0);
    });

    it('should have speedDropPercent configured', () => {
      expect(config.speedDropPercent).toBeDefined();
      expect(typeof config.speedDropPercent).toBe('number');
      expect(config.speedDropPercent).toBeGreaterThan(0);
    });

    it('should have retentionHours configured', () => {
      expect(config.retentionHours).toBeDefined();
      expect(typeof config.retentionHours).toBe('number');
      expect(config.retentionHours).toBeGreaterThan(0);
    });
  });

  describe('network test configuration', () => {
    it('should have network test settings', () => {
      expect(config.networkTest).toBeDefined();
      expect(config.networkTest.fileSizeBytes).toBeGreaterThan(0);
      expect(config.networkTest.uploadSizeBytes).toBeGreaterThan(0);
      expect(config.networkTest.maxRetries).toBeGreaterThan(0);
      expect(config.networkTest.timeoutMs).toBeGreaterThan(0);
      expect(config.networkTest.connectivityUrl).toBeDefined();
      expect(typeof config.networkTest.connectivityUrl).toBe('string');
    });
  });

  describe('computed paths', () => {
    it('should have dataFile path', () => {
      expect(config.dataFile).toContain('measurements.jsonl');
    });

    it('should have eventsFile path', () => {
      expect(config.eventsFile).toContain('events.jsonl');
    });

    it('should have dbFile path', () => {
      expect(config.dbFile).toContain('monitor.db');
    });

    it('should have historyDir path', () => {
      expect(config.historyDir).toContain('history');
    });

    it('should have dataDir path', () => {
      expect(config.dataDir).toBeDefined();
      expect(typeof config.dataDir).toBe('string');
    });
  });
});
