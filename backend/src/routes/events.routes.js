import express from 'express';
import { getRecent, getByDateRange } from '../controllers/events.controller.js';

const router = express.Router();

router.get('/recent', getRecent);
router.get('/', getByDateRange);

export default router;
