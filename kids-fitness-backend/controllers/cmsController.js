import asyncHandler from 'express-async-handler';
import CMSBlock from '../models/CMSBlock.js';
import mongoose from 'mongoose';

export const getPublicBlocks = asyncHandler(async (req, res) => {
  if (!req.brandId && !req.isAllBrands) {
    res.status(403);
    throw new Error('Brand context missing for CMS');
  }

  const query = { isActive: true };
  if (req.brandId) {
    query.brandId = req.brandId;
  }
  
  const locationId = req.headers['x-location-id'];
  if (locationId && locationId !== 'all' && mongoose.Types.ObjectId.isValid(locationId)) {
    // If user is viewing a specific branch, show blocks for that branch AND global blocks (locationId: null)
    query.$or = [
      { locationId: locationId },
      { locationId: null }
    ];
  } else {
    // If viewing globally, only show global blocks
    query.locationId = null;
  }

  const blocks = await CMSBlock.find(query).sort({ sortOrder: 1 });
  res.json(blocks);
});

export const getAdminBlocks = asyncHandler(async (req, res) => {
  const query = {};
  if (req.brandId) {
    query.brandId = req.brandId;
  }
  
  if (req.query.locationId && mongoose.Types.ObjectId.isValid(req.query.locationId)) {
    query.locationId = req.query.locationId;
  }

  const blocks = await CMSBlock.find(query).populate('locationId', 'name').sort({ sortOrder: 1 });
  res.json(blocks);
});

export const createBlock = asyncHandler(async (req, res) => {
  const { locationId, type, title, content, sortOrder, isActive } = req.body;
  
  if (!req.brandId) {
    res.status(400);
    throw new Error('Cannot create block without a brand context');
  }

  const block = await CMSBlock.create({
    brandId: req.brandId,
    locationId: locationId || null,
    type,
    title,
    content,
    sortOrder: sortOrder || 0,
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json(block);
});

export const updateBlock = asyncHandler(async (req, res) => {
  const block = await CMSBlock.findById(req.params.id);
  if (!block) {
    res.status(404);
    throw new Error('Block not found');
  }

  // Security check to ensure they aren't editing another brand's block
  if (req.brandId && block.brandId.toString() !== req.brandId.toString() && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Forbidden: Cannot update block from another brand');
  }

  Object.assign(block, req.body);
  const updatedBlock = await block.save();
  res.json(updatedBlock);
});

export const deleteBlock = asyncHandler(async (req, res) => {
  const block = await CMSBlock.findById(req.params.id);
  if (!block) {
    res.status(404);
    throw new Error('Block not found');
  }

  if (req.brandId && block.brandId.toString() !== req.brandId.toString() && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Forbidden: Cannot delete block from another brand');
  }

  await block.deleteOne();
  res.json({ message: 'Block removed' });
});
