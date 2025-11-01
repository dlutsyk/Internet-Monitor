import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReport, generateTodayReport } from './reports.service.js';
import * as metricsService from './metrics.service.js';
import * as analytics from '../analytics.js';

vi.mock('./metrics.service.js');
vi.mock('../analytics.js');

describe('reports.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate report for date range', async () => {
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-01-02T00:00:00Z';
      const mockMeasurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100 },
      ];
      const mockSummary = {
        totalSamples: 1,
        onlineSamples: 1,
        uptimePercent: 100,
      };
      const mockConfig = { intervalMs: 60000 };

      vi.mocked(metricsService.getByDateRange).mockResolvedValue(mockMeasurements);
      vi.mocked(analytics.computeSummary).mockReturnValue(mockSummary);

      const result = await generateReport(fromDate, toDate, mockConfig);

      expect(metricsService.getByDateRange).toHaveBeenCalledWith(fromDate, toDate);
      expect(analytics.computeSummary).toHaveBeenCalledWith(mockMeasurements, mockConfig);
      expect(result).toEqual({
        from: fromDate,
        to: toDate,
        summary: mockSummary,
        measurements: mockMeasurements,
      });
    });
  });

  describe('generateTodayReport', () => {
    it('should generate report for today', async () => {
      const mockDateRange = {
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-01T23:59:59.999Z',
      };
      const mockMeasurements = [
        { timestamp: '2024-01-01T10:00:00Z', status: 'online', downloadMbps: 100 },
      ];
      const mockSummary = {
        totalSamples: 1,
        onlineSamples: 1,
        uptimePercent: 100,
      };
      const mockConfig = { intervalMs: 60000 };

      vi.mocked(analytics.getTodayDateRange).mockReturnValue(mockDateRange);
      vi.mocked(metricsService.getByDateRange).mockResolvedValue(mockMeasurements);
      vi.mocked(analytics.computeSummary).mockReturnValue(mockSummary);

      const result = await generateTodayReport(mockConfig);

      expect(analytics.getTodayDateRange).toHaveBeenCalled();
      expect(metricsService.getByDateRange).toHaveBeenCalledWith(
        mockDateRange.from,
        mockDateRange.to
      );
      expect(result).toEqual({
        from: mockDateRange.from,
        to: mockDateRange.to,
        summary: mockSummary,
        measurements: mockMeasurements,
      });
    });
  });
});
