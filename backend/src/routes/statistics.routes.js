import express from 'express';
import {
  getDatabaseStats,
  cleanupDatabase,
  getDetailedStatistics,
} from '../controllers/statistics.controller.js';

const router = express.Router();

// Database routes
router.get('/database/stats', getDatabaseStats);
router.post('/database/cleanup', cleanupDatabase);

// Statistics routes
router.get('/detailed', getDetailedStatistics);

export default router;
