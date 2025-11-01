import express from 'express';
import { getHealth, getConfig } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/config', getConfig);

export default router;
