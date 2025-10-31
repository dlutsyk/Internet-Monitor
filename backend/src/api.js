import express from 'express';
import { computeSummary } from './analytics.js';

const clamp = (value, { min, max }) => Math.min(Math.max(value, min), max);

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function createApi({ storage, monitor, config }) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      simulation: config.simulationMode,
      intervalMs: config.intervalMs,
    });
  });

  router.get('/config', (req, res) => {
    res.json({
      intervalMs: config.intervalMs,
      speedDropThresholdMbps: config.speedDropThresholdMbps,
      speedDropPercent: config.speedDropPercent,
      simulationMode: config.simulationMode,
      wsPath: config.wsPath,
    });
  });

  router.get('/metrics/latest', (req, res) => {
    const [latest] = storage.getRecent(1).slice(-1);
    res.json({ data: latest ?? null });
  });

  router.get('/metrics/recent', (req, res) => {
    const limit = clamp(
      Number.parseInt(req.query.limit ?? '50', 10) || 50,
      { min: 1, max: 500 },
    );
    res.json({
      items: storage.getRecent(limit),
    });
  });

  router.get('/reports', async (req, res, next) => {
    try {
      const { from, to } = req.query;
      const fromDate = parseDate(from);
      const toDate = parseDate(to);

      if (from && !fromDate) {
        return res.status(400).json({ error: 'Invalid from date' });
      }
      if (to && !toDate) {
        return res.status(400).json({ error: 'Invalid to date' });
      }

      const records = await storage.readRange(
        fromDate?.toISOString(),
        toDate?.toISOString(),
      );
      const summary = computeSummary(records, {
        dropThresholdMbps: config.speedDropThresholdMbps,
        dropPercent: config.speedDropPercent,
        fallbackIntervalMs: config.intervalMs,
      });

      res.json({
        summary,
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
        records,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/monitor/trigger', async (req, res, next) => {
    try {
      const record = await monitor.triggerOnce();
      res.status(202).json({ data: record });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
