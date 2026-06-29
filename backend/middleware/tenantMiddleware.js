import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Brand from '../models/Brand.js';

export const tenantMiddleware = asyncHandler(async (req, res, next) => {
  const brandSelection = req.headers['x-brand-selection'];

  if (brandSelection === 'ALL') {
    req.isAllBrands = true;
    req.brandId = null;
  } else if (brandSelection && mongoose.Types.ObjectId.isValid(brandSelection)) {
    req.brandId = brandSelection;
    req.isAllBrands = false;
  } else if (brandSelection && typeof brandSelection === 'string') {
    // Fallback: Check if it's a domain name
    const brand = await Brand.findOne({ domains: brandSelection.toLowerCase() });
    if (brand) {
      req.brandId = brand._id.toString();
    }
  } else {
    // Auto-detect based on Origin (e.g. "http://localhost:5174")
    const origin = req.headers.origin;
    if (origin) {
      const originDomain = origin.replace(/^https?:\/\//, ''); // Removes http:// or https://
      const brand = await Brand.findOne({ domains: originDomain.toLowerCase() });
      if (brand) {
        req.brandId = brand._id.toString();
      }
    }
  }

  // Fallback to the first brand if no brand context is found
  if (!req.brandId && !req.isAllBrands) {
    const defaultBrand = await Brand.findOne({}).sort({ createdAt: 1 });
    if (defaultBrand) {
      req.brandId = defaultBrand._id.toString();
    }
  }

  next();
});
