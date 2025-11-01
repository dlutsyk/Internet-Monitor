import express from 'express';
import { getLatest, getRecent } from '../controllers/metrics.controller.js';

const router = express.Router();

router.get('/latest', getLatest);
router.get('/recent', getRecent);

export default router;
