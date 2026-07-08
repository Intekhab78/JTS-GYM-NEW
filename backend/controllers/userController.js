import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Trainer from '../models/Trainer.js';
import Child from '../models/Child.js';
import mongoose from 'mongoose';
import { resolveReadLocationId } from '../utils/locationScope.js';
import { sendAccountUpdateEmail, sendWelcomeEmail } from '../utils/mailer.js';
import bcrypt from 'bcryptjs';
import { withUAT } from '../middleware/uatMiddleware.js';

const syncTrainerProfile = async (user) => {
  if (user.role === 'trainer') {
    await Trainer.findOneAndUpdate(
      { email: user.email },
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        userId: user._id,
        locationIds: user.locationIds || [],
        status: 'active'
      },
      { upsert: true, new: true }
    );
  }
};

export const getUsers = asyncHandler(async (req, res) => {
  const isAdminOrSuper = req.user.role === 'superadmin' || req.user.role === 'admin';
  const locationId = resolveReadLocationId(req);

  // Show all users regardless of branch selection in management view
  const filter = {};
  if (req.brandId) {
    filter.brandIds = req.brandId;
  }

  const users = await User.find(withUAT(req, filter, true))
    .populate('locationIds', 'name')
    .populate('managerId', 'name role')
    .select('-password')
    .sort({ createdAt: -1 });
  res.json(users);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne(withUAT(req, { _id: req.params.id }, true)).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, email, phone, role, locationIds, allowUAT, canManageShifts, managerId } = req.body;

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400);
      throw new Error('This email is already in use by another account');
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role) user.role = role;
  if (allowUAT !== undefined) user.allowUAT = allowUAT;
  if (canManageShifts !== undefined) user.canManageShifts = canManageShifts;
  if (managerId !== undefined) {
    user.managerId = managerId || null;
  }

  if (req.user?.role === 'superadmin' && locationIds !== undefined) {
    user.locationIds = locationIds || [];
  }

  const saved = await user.save();
  await syncTrainerProfile(saved).catch(err => console.error('Trainer sync failed:', err.message));

  // Notify User of account changes
  sendAccountUpdateEmail(saved, 'account details/permissions').catch(err => console.error('Account update email failed:', err.message));

  res.json({
    _id: saved._id,
    name: saved.name,
    email: saved.email,
    phone: saved.phone,
    role: saved.role,
    locationIds: saved.locationIds,
    allowUAT: saved.allowUAT,
    canManageShifts: saved.canManageShifts
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Dependency Check: ONLY block if there are ACTIVE or FUTURE commitments AND we are deactivating.
  if (user.status === 'active') {
    const Booking = mongoose.model('Booking');
    const Membership = mongoose.model('Membership');

    const [futureBookingCount, activeMembershipCount] = await Promise.all([
      Booking.countDocuments({ userId: user._id, date: { $gt: new Date() }, status: { $in: ['pending', 'confirmed'] } }),
      Membership.countDocuments({ userId: user._id, endDate: { $gt: new Date() }, status: { $in: ['active', 'frozen'] } })
    ]);

    if (futureBookingCount > 0 || activeMembershipCount > 0) {
      res.status(400);
      throw new Error(`Cannot deactivate user: They have ${futureBookingCount} future/pending bookings and ${activeMembershipCount} active memberships. Please cancel these before deactivating.`);
    }
  }

  // Toggle status
  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();

  res.json({ message: `User status updated to ${user.status}`, status: user.status });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, locationIds, allowUAT, canManageShifts, managerId } = req.body;

  const userExists = await User.findOne(withUAT(req, { email }, true));
  if (userExists) {
    if (req.brandId && !userExists.brandIds.includes(req.brandId)) {
      userExists.brandIds.push(req.brandId);
      if (locationIds && locationIds.length > 0) {
        userExists.locationIds = [...new Set([...(userExists.locationIds || []).map(id => id.toString()), ...locationIds])];
      }
      if (role && userExists.role === 'customer' && role !== 'customer') {
        userExists.role = role; // Promote to staff if they were a customer
      }
      await userExists.save();
      return res.status(200).json({ message: 'User already existed in another gym. They have now been linked to this gym successfully.', user: userExists });
    }
    res.status(400);
    throw new Error('User already exists in this gym');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    brandIds: req.user.role === 'superadmin' ? (req.body.brandIds || []) : (req.brandId ? [req.brandId] : (req.user.brandIds || [])),
    locationIds: locationIds || (req.user.locationIds && req.user.locationIds.length > 0 ? [req.user.locationIds[0]] : []),
    managerId: managerId || undefined,
    isUAT: req.isUAT || false,
    allowUAT: allowUAT || false,
    canManageShifts: canManageShifts || false
  });

  await syncTrainerProfile(user).catch(err => console.error('Trainer sync failed:', err.message));

  if (user.role === 'customer' || user.role === 'parent') {
    sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err.message));
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    allowUAT: user.allowUAT,
    canManageShifts: user.canManageShifts
  });
});

export const getUserChildren = asyncHandler(async (req, res) => {
  const children = await Child.find(withUAT(req, { parentId: req.params.id }, true));
  res.json(children);
});

export const lookupUser = asyncHandler(async (req, res) => {
  const { query } = req.query; // email, phone, or name
  if (!query) {
    res.status(400);
    throw new Error('Search query is required');
  }

  const regex = new RegExp(query.trim(), 'i');
  const user = await User.findOne(withUAT(req, {
    role: { $in: ['parent', 'customer'] },
    $or: [
      { email: new RegExp(`^${query.trim()}$`, 'i') },
      { phone: query.trim() },
      { phone: regex },
      { name: regex }
    ]
  }, true)).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // SELF-HEALING: If the user is missing the current brand or location, auto-attach them
  let needsSave = false;
  const targetBrand = req.brandId || (req.user && req.user.brandIds && req.user.brandIds[0]);
  if (targetBrand && (!user.brandIds || !user.brandIds.some(id => id.toString() === targetBrand.toString()))) {
    user.brandIds = [...(user.brandIds || []), targetBrand];
    needsSave = true;
  }
  const targetLocationId = req.headers['x-location-id'] || (req.user && req.user.locationIds && req.user.locationIds[0]);
  if (targetLocationId && (!user.locationIds || !user.locationIds.some(id => id.toString() === targetLocationId.toString()))) {
    user.locationIds = [...(user.locationIds || []), targetLocationId];
    needsSave = true;
  }
  
  if (needsSave) {
    await user.save();
  }

  const children = await Child.find(withUAT(req, { parentId: user._id }, true));
  res.json({ user, children });
});


export const createWalkingCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, altPhone, gender, address, birthDate, children } = req.body;

  if (!name || (!email && !phone)) {
    res.status(400);
    throw new Error('Name and at least one contact method (email or phone) is required');
  }

  let user;
  if (email) {
    user = await User.findOne(withUAT(req, { email: new RegExp(`^${email}$`, 'i') }, true));
  } else if (phone) {
    user = await User.findOne(withUAT(req, { phone }, true));
  }

  if (!user) {
    // Generate a secure random password for the walking customer
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const targetLocationId = req.headers['x-location-id'] || (req.user.locationIds && req.user.locationIds[0]);
    user = await User.create({
      name,
      email: email || undefined,
      phone,
      altPhone,
      gender,
      address,
      birthDate,
      password: hashedPassword,
      role: 'customer',
      status: 'active',
      brandIds: req.brandId ? [req.brandId] : (req.user.brandIds || []),
      locationIds: targetLocationId ? [targetLocationId] : (req.user.locationIds || []),
      isUAT: req.isUAT || false
    });

    sendWelcomeEmail(user).catch(err => console.error('Welcome email failed for walking customer:', err.message));
  } else {
    // Update existing user details if provided and missing
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (altPhone) user.altPhone = altPhone;
    if (gender) user.gender = gender;
    if (address) user.address = address;
    if (birthDate) user.birthDate = birthDate;
    
    const targetBrand = req.brandId || (req.user.brandIds && req.user.brandIds[0]);
    if (targetBrand && (!user.brandIds || !user.brandIds.some(id => id.toString() === targetBrand.toString()))) {
      user.brandIds = [...(user.brandIds || []), targetBrand];
    }
    
    const targetLocationId = req.headers['x-location-id'] || (req.user.locationIds && req.user.locationIds[0]);
    if (targetLocationId && (!user.locationIds || !user.locationIds.some(id => id.toString() === targetLocationId.toString()))) {
      user.locationIds = [...(user.locationIds || []), targetLocationId];
    }
    
    await user.save();
  }

  // Handle children if provided
  const createdChildren = [];
  if (children && Array.isArray(children)) {
    for (const childData of children) {
      if (childData._id) {
        // Existing child update? Or just skip if already added
        continue;
      }
      const newChild = await Child.create({
        parentId: user._id,
        name: childData.name,
        age: childData.age,
        gender: childData.gender || 'male',
        relationship: childData.relationship,
        email: childData.email,
        phone: childData.phone,
        locationId: req.user.locationIds && req.user.locationIds.length > 0 ? req.user.locationIds[0] : undefined,
        isUAT: req.isUAT || false
      });
      createdChildren.push(newChild);
    }
  }

  const allChildren = await Child.find(withUAT(req, { parentId: user._id }, true));

  res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    children: allChildren
  });
});

export const suggestUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }
  const regex = new RegExp(query.trim(), 'i');
  const users = await User.find(withUAT(req, {
    role: { $in: ['parent', 'customer'] },
    status: 'active',
    $or: [{ name: regex }, { email: regex }, { phone: regex }]
  }, true))
    .select('_id name email phone role')
    .limit(8)
    .lean();
  res.json(users);
});


export const adminUpdatePassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  await user.save();

  // Notify User of security change
  sendAccountUpdateEmail(user, 'password').catch(err => console.error('Security update email failed:', err.message));

  res.json({ message: 'Password updated successfully' });
});

// @desc    Update last viewed timestamp for a category
// @route   PUT /api/users/last-viewed/:category
// @access  Private/Admin
export const updateLastViewed = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const updateKey = `seenAt.${category}`;
  
  await User.findByIdAndUpdate(req.user._id, { 
    $set: { [updateKey]: new Date() } 
  });

  res.json({ message: `Seen status for ${category} updated` });
});
