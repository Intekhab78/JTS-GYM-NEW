import Shift from '../models/Shift.js';
import Payment from '../models/Payment.js';

// @desc    Open a new shift
// @route   POST /api/shifts/open
// @access  Private (Cashier/Admin)
export const openShift = async (req, res, next) => {
  try {
    const { startingCash, locationId, openingDenominations } = req.body;

    // Check if user already has an open shift
    const existingShift = await Shift.findOne({ cashierId: req.user._id, status: 'open' });
    if (existingShift) {
      return res.status(400).json({ message: 'You already have an open shift. Please close it first.' });
    }

    const shift = await Shift.create({
      cashierId: req.user._id,
      locationId: locationId || req.user.locationId,
      status: 'open',
      openedAt: new Date(),
      startingCash: Number(startingCash) || 0,
      openingDenominations,
      currentDenominations: openingDenominations
    });

    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
};

// @desc    Get the current open shift for the user
// @route   GET /api/shifts/current
// @access  Private
export const getCurrentShift = async (req, res, next) => {
  try {
    const shift = await Shift.findOne({ cashierId: req.user._id, status: 'open' });
    res.json(shift || null);
  } catch (error) {
    next(error);
  }
};

// @desc    Get the current shift expected totals for closing calculation
// @route   GET /api/shifts/current/totals
// @access  Private
export const getCurrentShiftTotals = async (req, res, next) => {
  try {
    const shift = await Shift.findOne({ cashierId: req.user._id, status: 'open' });
    if (!shift) {
      return res.status(400).json({ message: 'No open shift found.' });
    }

    const payments = await Payment.find({
      processedBy: req.user._id,
      createdAt: { $gte: shift.openedAt }
    });

    let expectedCash = 0;
    let expectedCard = 0;
    let expectedCardBrands = {};
    let expectedOnline = 0;

    payments.forEach(payment => {
      if (payment.paymentMethod === 'split' && payment.splitDetails) {
        payment.splitDetails.forEach(split => {
          const splitAmount = split.amount || 0;
          if (split.method === 'cash' || split.method === 'center_cash') {
            expectedCash += splitAmount;
          } else if (split.method === 'card' || split.method === 'terminal' || split.method === 'center_card') {
            expectedCard += splitAmount;
            const brand = split.brand ? split.brand.toLowerCase() : 'other';
            expectedCardBrands[brand] = (expectedCardBrands[brand] || 0) + splitAmount;
          } else {
            expectedOnline += splitAmount;
          }
        });
        return;
      }

      const amount = payment.amount || 0;
      if (payment.paymentMethod === 'cash' || payment.paymentMethod === 'center_cash') {
        expectedCash += amount;
      } else if (payment.paymentMethod === 'card' || payment.paymentMethod === 'terminal') {
        expectedCard += amount;
        const brand = payment.cardBrand ? payment.cardBrand.toLowerCase() : 'other';
        expectedCardBrands[brand] = (expectedCardBrands[brand] || 0) + amount;
      } else {
        expectedOnline += amount;
      }
    });

    res.json({
      startingCash: shift.startingCash,
      expectedCash,
      expectedCard,
      expectedCardBrands,
      expectedOnline,
      currentDenominations: shift.currentDenominations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close the current shift
// @route   POST /api/shifts/close
// @access  Private
export const closeShift = async (req, res, next) => {
  try {
    const { actualCash, actualCardBrands, notes, closingDenominations } = req.body;

    const shift = await Shift.findOne({ cashierId: req.user._id, status: 'open' });
    if (!shift) {
      return res.status(400).json({ message: 'No open shift found to close.' });
    }

    const closedAt = new Date();

    // Query all payments processed by this cashier during this shift
    const payments = await Payment.find({
      processedBy: req.user._id,
      createdAt: { $gte: shift.openedAt, $lte: closedAt }
    });

    // Calculate expected totals based on paymentMethod
    let expectedCash = 0;
    let expectedCard = 0;
    let expectedCardBrands = {};
    let expectedOnline = 0;

    payments.forEach(payment => {
      if (payment.paymentMethod === 'split' && payment.splitDetails) {
        payment.splitDetails.forEach(split => {
          const splitAmount = split.amount || 0;
          if (split.method === 'cash' || split.method === 'center_cash') {
            expectedCash += splitAmount;
          } else if (split.method === 'card' || split.method === 'terminal') {
            expectedCard += splitAmount;
          } else {
            expectedOnline += splitAmount;
          }
        });
        return;
      }

      const amount = payment.amount || 0;
      if (payment.paymentMethod === 'cash' || payment.paymentMethod === 'center_cash') {
        expectedCash += amount;
      } else if (payment.paymentMethod === 'card' || payment.paymentMethod === 'terminal') {
        expectedCard += amount;
        const brand = payment.cardBrand ? payment.cardBrand.toLowerCase() : 'other';
        expectedCardBrands[brand] = (expectedCardBrands[brand] || 0) + amount;
      } else {
        expectedOnline += amount;
      }
    });

    // Calculate discrepancy (Starting Cash + Payments in Cash - Actual Cash Counted)
    const totalExpectedCashInDrawer = shift.startingCash + expectedCash;
    const cashDiscrepancy = Number(actualCash) - totalExpectedCashInDrawer;
    let cardDiscrepancyTotal = 0;
    Object.keys(expectedCardBrands).forEach(brand => {
      const actual = (actualCardBrands && actualCardBrands[brand]) ? Number(actualCardBrands[brand]) : 0;
      const expected = expectedCardBrands[brand];
      if (actual !== expected) cardDiscrepancyTotal += Math.abs(actual - expected);
    });

    const hasDiscrepancy = cashDiscrepancy !== 0 || cardDiscrepancyTotal !== 0;

    if (hasDiscrepancy && !notes) {
      return res.status(400).json({ message: 'A discrepancy was found. Please provide notes to explain the difference before closing.' });
    }

    shift.closedAt = closedAt;
    shift.status = 'closed';
    shift.expectedCash = expectedCash;
    shift.expectedCard = expectedCard;
    shift.expectedCardBrands = expectedCardBrands;
    shift.expectedOnline = expectedOnline;
    shift.actualCash = Number(actualCash);
    shift.actualCardBrands = actualCardBrands || {};
    shift.discrepancy = cashDiscrepancy; // keeping main discrepancy as cash, or we could sum them
    if (closingDenominations) shift.closingDenominations = closingDenominations;
    if (notes) shift.notes = notes;

    await shift.save();

    res.json(shift);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all shifts (Admin)
// @route   GET /api/shifts
// @access  Private/Admin
export const getAllShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({})
      .populate('cashierId', 'name email role')
      .populate('locationId', 'name')
      .sort({ openedAt: -1 });

    res.json(shifts);
  } catch (error) {
    next(error);
  }
};

// @desc    Exchange denominations without changing total cash
// @route   PUT /api/shifts/current/denominations
// @access  Private
export const exchangeDenominations = async (req, res, next) => {
  try {
    const { newDenominations, reason } = req.body;

    const shift = await Shift.findOne({ cashierId: req.user._id, status: 'open' });
    if (!shift) {
      return res.status(400).json({ message: 'No open shift found.' });
    }

    const previousDenominations = shift.currentDenominations || {};

    // Calculate totals to ensure they match
    let previousTotal = 0;
    Object.entries(previousDenominations).forEach(([val, count]) => {
      previousTotal += Number(val) * (Number(count) || 0);
    });

    let newTotal = 0;
    Object.entries(newDenominations).forEach(([val, count]) => {
      newTotal += Number(val) * (Number(count) || 0);
    });

    if (Math.abs(previousTotal - newTotal) > 0.01) {
      return res.status(400).json({ 
        message: 'The total cash amount must remain the same during an exchange.',
        expected: previousTotal,
        provided: newTotal
      });
    }

    shift.currentDenominations = newDenominations;
    shift.denominationExchanges.push({
      timestamp: new Date(),
      previousDenominations,
      newDenominations,
      reason: reason || 'Manual Cash Exchange'
    });

    await shift.save();

    res.json(shift);
  } catch (error) {
    next(error);
  }
};
