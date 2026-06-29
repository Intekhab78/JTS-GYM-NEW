import express from 'express';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand
} from '../controllers/brandController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only superadmins should really manage brands, but we use adminOnly for now 
// and can enforce superadmin checks if needed.
router.route('/')
  .get(protect, adminOnly, getBrands)
  .post(protect, adminOnly, createBrand);

router.route('/:id')
  .get(protect, adminOnly, getBrandById)
  .put(protect, adminOnly, updateBrand);

export default router;
