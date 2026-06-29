import Vendor from '../models/Vendor.js';
import Payment from '../models/Payment.js';

export const createVendor = async (req, res) => {
  try {
    const { name, companyName, email, phone, status } = req.body;
    const vendor = new Vendor({ name, companyName, email, phone, status });
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    const vendors = await Vendor.find(query).sort({ createdAt: -1 });
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendorSales = async (req, res) => {
  try {
    const { vendorId, startDate, endDate } = req.query;
    
    if (!vendorId) {
      return res.status(400).json({ message: 'vendorId is required' });
    }

    const query = {
      isVendorSale: true,
      vendorId,
      status: 'paid'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sales = await Payment.find(query)
      .populate('userId', 'name email phone')
      .populate('planId', 'name')
      .populate('membershipId')
      .sort({ createdAt: -1 });

    const totalSalePrice = sales.reduce((acc, curr) => acc + (curr.vendorSalePrice || 0), 0);
    const totalMargin = sales.reduce((acc, curr) => acc + (curr.vendorMargin || 0), 0);
    const totalGymRevenue = sales.reduce((acc, curr) => acc + (curr.gymRevenue || 0), 0);

    res.status(200).json({
      sales,
      summary: {
        totalSalePrice,
        totalMargin,
        totalGymRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
