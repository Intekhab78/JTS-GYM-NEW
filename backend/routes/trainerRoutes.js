import express from 'express';
import {
  getTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer
} from '../controllers/trainerController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

import { getTrainerPayroll } from '../controllers/payrollController.js';

const router = express.Router();

router.get('/payroll', protect, adminOnly, getTrainerPayroll);
router.get('/', getTrainers);
router.get('/:id', getTrainerById);
router.post('/', protect, adminOnly, createTrainer);
router.put('/:id', protect, adminOnly, updateTrainer);
router.delete('/:id', protect, adminOnly, deleteTrainer);

export default router;
