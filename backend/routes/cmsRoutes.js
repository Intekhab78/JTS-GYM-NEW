import express from 'express';
import { getPublicBlocks, getAdminBlocks, createBlock, updateBlock, deleteBlock } from '../controllers/cmsController.js';
import { protect, checkPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for homepage
router.get('/public', getPublicBlocks);

// Admin routes
router.get('/', protect, checkPermission('cms:view'), getAdminBlocks);
router.post('/', protect, checkPermission('cms:create'), createBlock);
router.put('/:id', protect, checkPermission('cms:update'), updateBlock);
router.delete('/:id', protect, checkPermission('cms:delete'), deleteBlock);

export default router;
