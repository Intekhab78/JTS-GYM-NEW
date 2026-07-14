import express from 'express';
import {
  openShift,
  closeShift,
  getCurrentShift,
  getCurrentShiftTotals,
  getAllShifts,
  exchangeDenominations
} from '../controllers/shiftController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/open', protect, openShift);
router.post('/close', protect, closeShift);
router.get('/current', protect, getCurrentShift);
router.get('/current/totals', protect, getCurrentShiftTotals);
router.put('/current/denominations', protect, exchangeDenominations);
router.get('/', protect, adminOnly, getAllShifts);

export default router;
