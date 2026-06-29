import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createVendor,
  getVendors,
  updateVendor,
  getVendorSales
} from '../controllers/vendorController.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.post('/', createVendor);
router.get('/', getVendors);
router.get('/sales', getVendorSales);
router.put('/:id', updateVendor);

export default router;
