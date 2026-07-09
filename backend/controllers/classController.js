import asyncHandler from 'express-async-handler';
import ClassModel from '../models/Class.js';
import Plan from '../models/Plan.js';
import Promotion from '../models/Promotion.js';
import mongoose from 'mongoose';
import { resolveReadLocationId, resolveWriteLocationId } from '../utils/locationScope.js';
import { withUAT } from '../middleware/uatMiddleware.js';

export const getClasses = asyncHandler(async (req, res) => {
  const { locationId: queryLocationId, all } = req.query;
  const locationId = queryLocationId || resolveReadLocationId(req);
  
  let filter = (locationId && locationId !== 'all') ? { locationId } : {};
  if (all !== 'true') {
    filter.status = 'active';
  }
  if (req.brandId) {
    filter.brandId = req.brandId;
  }

  // Fetch classes with environment isolation
  const classes = await ClassModel.find(withUAT(req, filter))
    .populate('availableTrainers', 'name status locationIds bio specialties avatarUrl gallery')
    .sort({ createdAt: -1 });

  // Fetch active promotions
  const now = new Date();
  const activePromos = await Promotion.find(withUAT(req, {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  })).lean();

  // Attach promotions to each class
  const classesWithPromos = classes.map(c => {
    const classObj = c.toObject();
    classObj.activePromotions = activePromos.filter(p => {
      // Global promotion for this location?
      if (p.applicableLocations && p.applicableLocations.length > 0) {
        if (!p.applicableLocations.some(locId => locId.toString() === classObj.locationId?.toString())) {
            return false;
        }
      }

      // Specific class promotion?
      const hasItemConstraint = (p.applicableClasses && p.applicableClasses.length > 0) || 
                               (p.applicablePlans && p.applicablePlans.length > 0);
      
      if (!hasItemConstraint) return true; // It's a general location/global promo

      return p.applicableClasses?.some(id => id.toString() === classObj._id.toString());
    });
    return classObj;
  });

  res.json(classesWithPromos);
});

export const getClassById = asyncHandler(async (req, res) => {
  const locationId = resolveReadLocationId(req);
  let filter = { _id: req.params.id };
  if (locationId && locationId !== 'all') {
    filter.locationId = locationId;
  }
  if (req.brandId) {
    filter.brandId = req.brandId;
  }
  
  const classItem = await ClassModel.findOne(withUAT(req, filter))
    .populate('availableTrainers', 'name status locationIds bio specialties avatarUrl gallery');
    
  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }
  res.json(classItem);
});

export const createClass = asyncHandler(async (req, res) => {
  const { title, description, ageGroup, duration, availableTrainers, price, b2bPrice, vendorPrices, capacity, imageUrl, creditCost } = req.body;
  if (!title || price == null) {
    res.status(400);
    throw new Error('Title and price are required');
  }
  const locationId = resolveWriteLocationId(req);
  if (!locationId) {
    res.status(400);
    throw new Error('Location is required');
  }

  const validTrainers = Array.isArray(availableTrainers)
    ? availableTrainers.filter(t => t && mongoose.Types.ObjectId.isValid(t))
    : [];

  if (validTrainers.length === 0) {
    res.status(400);
    throw new Error('At least one trainer is required');
  }

  const existingMain = await ClassModel.findOne({ title, locationId, brandId: req.brandId, isUAT: req.isUAT || false });
  if (existingMain) {
    res.status(400);
    throw new Error('A class with this title already exists in this location');
  }

  const created = await ClassModel.create({
    title,
    description,
    ageGroup,
    duration,
    availableTrainers: validTrainers,
    price,
    b2bPrice,
    vendorPrices,
    capacity: (capacity === '' || capacity == null) ? null : Number(capacity),
    imageUrl,
    creditCost: creditCost || 1,
    locationId,
    brandId: req.brandId,
    isUAT: req.isUAT || false,
    categoryId: req.body.categoryId,
    taxId: req.body.taxId,
    status: req.body.status || 'active',
    minAge: req.body.minAge,
    maxAge: req.body.maxAge,
    color: req.body.color
  });

  if (req.body.replicateToLocations && Array.isArray(req.body.replicateToLocations)) {
    const locationsToReplicate = req.body.replicateToLocations.filter(id => id !== locationId.toString());
    for (const locId of locationsToReplicate) {
      if (mongoose.Types.ObjectId.isValid(locId)) {
        const existingRep = await ClassModel.findOne({ title: created.title, locationId: locId, brandId: req.brandId, isUAT: req.isUAT || false });
        if (!existingRep) {
          await ClassModel.create({
            ...created.toObject(),
            _id: new mongoose.Types.ObjectId(),
            locationId: locId
          });
        } else {
          // If it already exists, just make sure it's active and updated
          Object.assign(existingRep, req.body);
          existingRep.locationId = locId;
          existingRep.status = 'active';
          await existingRep.save();
        }
      }
    }
  }

  res.status(201).json(created);
});

export const updateClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }
  if (req.user?.role === 'admin' && req.user.locationId && classItem.locationId?.toString() !== req.user.locationId.toString()) {
    res.status(403);
    throw new Error('Not allowed');
  }
  if (req.brandId && classItem.brandId?.toString() !== req.brandId.toString() && req.user?.role !== 'superadmin') {
    res.status(403);
    throw new Error('Not allowed for this brand');
  }

  if (req.body.availableTrainers !== undefined) {
    const validTrainers = Array.isArray(req.body.availableTrainers)
      ? req.body.availableTrainers.filter(t => t && mongoose.Types.ObjectId.isValid(t))
      : [];
    if (validTrainers.length === 0) {
      res.status(400);
      throw new Error('At least one trainer is required');
    }
    req.body.availableTrainers = validTrainers;
  }

  if (req.body.capacity !== undefined) {
    req.body.capacity = (req.body.capacity === '' || req.body.capacity == null) ? null : Number(req.body.capacity);
  }

  Object.assign(classItem, req.body);
  const saved = await classItem.save();

  if (req.body.replicateToLocations && Array.isArray(req.body.replicateToLocations)) {
    const locationsToReplicate = req.body.replicateToLocations.filter(id => id !== classItem.locationId?.toString());
    
    // Deactivate siblings that are no longer selected
    const siblings = await ClassModel.find({ 
      title: saved.title, 
      brandId: saved.brandId, 
      isUAT: req.isUAT || false,
      locationId: { $ne: classItem.locationId }
    });

    for (const sibling of siblings) {
      if (!locationsToReplicate.includes(sibling.locationId?.toString())) {
        sibling.status = 'inactive';
        await sibling.save();
      }
    }

    for (const locId of locationsToReplicate) {
      if (mongoose.Types.ObjectId.isValid(locId)) {
        // Check if a class with the same title already exists in that location to avoid duplicates
        const existing = await ClassModel.findOne({ title: saved.title, locationId: locId, brandId: saved.brandId, isUAT: req.isUAT || false });
        if (!existing) {
          const newClassObj = saved.toObject();
          delete newClassObj._id;
          delete newClassObj.createdAt;
          delete newClassObj.updatedAt;
          newClassObj.locationId = locId;
          newClassObj.status = 'active'; // ensure new copies are active
          await ClassModel.create(newClassObj);
        } else {
          // If it exists, update it to match the current edits
          Object.assign(existing, req.body);
          existing.locationId = locId; // ensure location remains correct
          existing.status = 'active'; // revive if it was inactive
          await existing.save();
        }
      }
    }
    
    // Deactivate the primary class itself if its location was unchecked
    if (!req.body.replicateToLocations.includes(classItem.locationId?.toString())) {
      saved.status = 'inactive';
      await saved.save();
    } else if (saved.status === 'inactive') {
      saved.status = 'active';
      await saved.save();
    }
  }

  res.json(saved);
});

export const deleteClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  // Dependency Check: Block ONLY if there are FUTURE scheduled sessions
  const Session = mongoose.model('Session');
  const futureSessionCount = await Session.countDocuments({ 
    classId: classItem._id, 
    startTime: { $gt: new Date() },
    status: 'scheduled'
  });
  
  if (futureSessionCount > 0) {
    res.status(400);
    throw new Error(`Cannot disable class: There are ${futureSessionCount} future sessions scheduled. Please cancel them first.`);
  }

  if (req.user?.role === 'admin' && req.user.locationId && classItem.locationId?.toString() !== req.user.locationId.toString()) {
    res.status(403);
    throw new Error('Not allowed');
  }
  if (req.brandId && classItem.brandId?.toString() !== req.brandId.toString() && req.user?.role !== 'superadmin') {
    res.status(403);
    throw new Error('Not allowed for this brand');
  }

  // Toggle status instead of deleting
  classItem.status = classItem.status === 'active' ? 'inactive' : 'active';
  await classItem.save();

  res.json({ message: `Class status updated to ${classItem.status}`, status: classItem.status });
});
