import express from 'express';
import { logAbortedBooking, getAbortedBookings } from '../controllers/abortedBookingController.js';
import { protect, staffOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Cashiers can log an aborted booking
router.post('/', logAbortedBooking);

// Admins/Superadmins can view all aborted bookings
// Adding store-manager and cashier just in case they need to see their own, 
// though the controller currently allows fetching. Let's restrict it to staff roles.
router.get('/', staffOnly, getAbortedBookings);

export default router;
