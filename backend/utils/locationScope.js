export const resolveReadLocationId = (req, requestedLocationId = null) => {
  const reqLoc = requestedLocationId || req.locationId;
  if (!req.user) {
    return reqLoc ? reqLoc.toString() : null;
  }

  const isSuperadmin = req.user?.role === 'superadmin';

  if (isSuperadmin) {
    return reqLoc ? reqLoc.toString() : null;
  }

  const isStaff = req.user.role === 'admin' ||
    req.user.role === 'trainer' ||
    (req.user.permissions && req.user.permissions.length > 0) ||
    !['parent', 'customer'].includes(req.user.role?.toLowerCase());

  if (!isStaff) {
    return reqLoc ? reqLoc.toString() : null;
  }

  const allowedIds = [];
  if (req.user?.locationIds && req.user.locationIds.length > 0) {
    allowedIds.push(...req.user.locationIds.map(id => id.toString()));
  }
  if (req.user?.locationId) {
    const singleId = req.user.locationId.toString();
    if (!allowedIds.includes(singleId)) {
      allowedIds.push(singleId);
    }
  }

  // If a specific location is requested, check if allowed
  if (reqLoc && allowedIds.includes(reqLoc.toString())) {
    return reqLoc.toString();
  }

  // If no specific location requested, or requested one is not allowed, return their first allowed location
  return allowedIds.length > 0 ? allowedIds[0] : '000000000000000000000000';
};

export const resolveReadLocationIds = (req, requestedLocationId = null) => {
  const reqLoc = requestedLocationId || req.locationId;
  if (!req.user) {
    return reqLoc && reqLoc !== 'all' ? [reqLoc.toString()] : null;
  }

  const isSuperadmin = req.user?.role === 'superadmin';

  const allowedIds = [];
  if (req.user?.locationIds && req.user.locationIds.length > 0) {
    allowedIds.push(...req.user.locationIds.map(id => id.toString()));
  }
  if (req.user?.locationId) {
    const singleId = req.user.locationId.toString();
    if (!allowedIds.includes(singleId)) {
      allowedIds.push(singleId);
    }
  }

  if (isSuperadmin) {
    return reqLoc && reqLoc !== 'all' ? [reqLoc.toString()] : null;
  }

  const isStaff = req.user.role === 'admin' ||
    req.user.role === 'trainer' ||
    (req.user.permissions && req.user.permissions.length > 0) ||
    !['parent', 'customer'].includes(req.user.role?.toLowerCase());

  if (!isStaff) {
    return reqLoc && reqLoc !== 'all' ? [reqLoc.toString()] : null;
  }

  if (reqLoc && reqLoc !== 'all') {
    if (allowedIds.includes(reqLoc.toString())) {
      return [reqLoc.toString()];
    } else {
      return ['000000000000000000000000']; // Not authorized for this location
    }
  }

  return allowedIds.length > 0 ? allowedIds : ['000000000000000000000000'];
};

export const resolveWriteLocationId = (req) => {
  if (req.user?.role === 'superadmin' && req.body?.locationIds && req.body.locationIds.length > 0) {
    return req.body.locationIds[0];
  }
  return req.locationId || (req.user?.locationIds && req.user.locationIds.length > 0 ? req.user.locationIds[0] : null);
};

export const requireLocationId = (req) => {
  const locationId = resolveWriteLocationId(req);
  if (!locationId) {
    throw new Error('Location is required');
  }
  return locationId;
};
