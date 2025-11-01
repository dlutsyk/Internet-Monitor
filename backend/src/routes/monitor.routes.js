import express from 'express';
import { triggerMeasurement } from '../controllers/monitor.controller.js';

const router = express.Router();

router.post('/trigger', triggerMeasurement);

export default router;
