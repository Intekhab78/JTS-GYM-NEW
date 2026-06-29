import asyncHandler from 'express-async-handler';
import Brand from '../models/Brand.js';

// @desc    Get all brands
// @route   GET /api/brands
// @access  Private/Superadmin
export const getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({}).sort({ createdAt: -1 });
  res.json(brands);
});

// @desc    Get brand by ID
// @route   GET /api/brands/:id
// @access  Private/Superadmin
export const getBrandById = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (brand) {
    res.json(brand);
  } else {
    res.status(404);
    throw new Error('Brand not found');
  }
});

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private/Superadmin
export const createBrand = asyncHandler(async (req, res) => {
  const { name, slug, domains, theme, contactEmail, contactPhone } = req.body;

  const brandExists = await Brand.findOne({ slug });
  if (brandExists) {
    res.status(400);
    throw new Error('Brand with this slug already exists');
  }

  const brand = await Brand.create({
    name,
    slug,
    domains,
    theme,
    contactEmail,
    contactPhone
  });

  res.status(201).json(brand);
});

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private/Superadmin
export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);

  if (brand) {
    brand.name = req.body.name || brand.name;
    brand.slug = req.body.slug || brand.slug;
    brand.domains = req.body.domains || brand.domains;
    brand.theme = req.body.theme || brand.theme;
    brand.status = req.body.status || brand.status;
    brand.contactEmail = req.body.contactEmail || brand.contactEmail;
    brand.contactPhone = req.body.contactPhone || brand.contactPhone;

    const updatedBrand = await brand.save();
    res.json(updatedBrand);
  } else {
    res.status(404);
    throw new Error('Brand not found');
  }
});
