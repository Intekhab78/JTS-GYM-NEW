import AbortedBooking from '../models/AbortedBooking.js';
import User from '../models/User.js';

export const logAbortedBooking = async (req, res) => {
  try {
    const { type, reason, attemptData } = req.body;
    const cashierId = req.user._id;

    if (!type || !reason) {
      return res.status(400).json({ message: 'Type and reason are required.' });
    }

    const cashier = await User.findById(cashierId);
    if (!cashier) {
      return res.status(404).json({ message: 'Cashier not found.' });
    }

    const abortedBooking = new AbortedBooking({
      cashierId,
      locationId: cashier.branchId || null, // Assuming branchId relates to location
      type,
      reason,
      attemptData
    });

    await abortedBooking.save();

    res.status(201).json({ message: 'Aborted booking logged successfully.', abortedBooking });
  } catch (error) {
    console.error('Error logging aborted booking:', error);
    res.status(500).json({ message: 'Failed to log aborted booking.' });
  }
};

export const getAbortedBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.cashierId) filter.cashierId = req.query.cashierId;

    const abortedBookings = await AbortedBooking.find(filter)
      .populate('cashierId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AbortedBooking.countDocuments(filter);

    res.status(200).json({
      abortedBookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total
    });
  } catch (error) {
    console.error('Error fetching aborted bookings:', error);
    res.status(500).json({ message: 'Failed to fetch aborted bookings.' });
  }
};
