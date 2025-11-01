import express from 'express';
import { getToday, getReport } from '../controllers/reports.controller.js';

const router = express.Router();

router.get('/today', getToday);
router.get('/', getReport);

export default router;
