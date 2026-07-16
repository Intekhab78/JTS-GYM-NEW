import express from 'express';
import { getMyPayments, getAllPayments, createPayment, createBookingPayment, exportPaymentsCsv } from '../controllers/paymentController.js';
import { createOrder, getRazorpayKey, handleWebhook } from '../controllers/razorpayController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/mine', protect, getMyPayments);
router.get('/', protect, adminOnly, getAllPayments);
router.get('/export/csv', protect, adminOnly, exportPaymentsCsv);
router.post('/', protect, createPayment);
router.post('/booking', protect, createBookingPayment);

// Razorpay endpoints
router.get('/razorpay/key', getRazorpayKey);
router.post('/razorpay/order', createOrder);
router.post('/razorpay/webhook', handleWebhook);

export default router;
