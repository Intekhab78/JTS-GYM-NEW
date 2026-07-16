import Razorpay from 'razorpay';
import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Payment from '../models/Payment.js';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys are not configured in environment variables');
  }
  
  if (!razorpayInstance || razorpayInstance.key_id !== key_id || razorpayInstance.key_secret !== key_secret) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  }
  return razorpayInstance;
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/razorpay/order
// @access  Protected/Public
export const createOrder = asyncHandler(async (req, res) => {
  const { amount, currency } = req.body;
  if (!amount) {
    res.status(400);
    throw new Error('Amount is required');
  }

  const razorpay = getRazorpayInstance();
  
  // Razorpay expects amount in paise (smallest currency unit, e.g. 100 paise = 1 INR)
  const options = {
    amount: Math.round(amount * 100), 
    currency: (currency || 'INR').toUpperCase(),
    receipt: `receipt_order_${Date.now()}`,
    notes: {
      website_source: "JTS Kids Gym",
      description: "Kids Fitness Gym Booking & Membership Payment"
    }
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(201).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500);
    throw new Error(error.message || 'Razorpay order creation failed');
  }
});

// @desc    Get Razorpay Key ID
// @route   GET /api/payments/razorpay/key
// @access  Public
export const getRazorpayKey = asyncHandler(async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    res.status(400);
    throw new Error('Razorpay Key ID is not configured');
  }
  res.json({ keyId });
});

// Verify signature function for backend use
export const verifySignature = (orderId, paymentId, signature) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('Razorpay Secret Key is not configured');
  }
  
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
    
  return generatedSignature === signature;
};

// @desc    Handle Razorpay Webhook Events (Safety Net)
// @route   POST /api/payments/razorpay/webhook
// @access  Public
export const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    res.status(400);
    throw new Error('Webhook signature header missing');
  }

  // Get raw body (requires express.json verify middleware)
  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    res.status(400);
    throw new Error('Invalid webhook signature');
  }

  const { event, payload } = req.body;
  console.log(`[Razorpay Webhook Received] Event: ${event}`);

  // Segregate multi-website payments: Only process if it belongs to JTS Kids Gym
  const paymentEntity = payload?.payment?.entity;
  const websiteSource = paymentEntity?.notes?.website_source;

  if (websiteSource !== 'JTS Kids Gym') {
    console.log(`[Razorpay Webhook] Skipped event for other website: ${websiteSource || 'Unknown'}`);
    return res.status(200).json({ status: 'ignored', message: 'Not matching website source' });
  }

  // Handle events
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id;
    
    console.log(`[Razorpay Webhook] Payment Successful! Payment ID: ${paymentId}, Order ID: ${orderId}`);
    
    // Find the payment record by reference (which holds razorpay_payment_id)
    let payment = await Payment.findOne({ reference: paymentId });
    if (payment) {
      if (payment.status === 'pending') {
        payment.status = 'paid';
        await payment.save();
        console.log(`[Razorpay Webhook] Updated existing payment ${paymentId} status to paid.`);
      }
    } else {
      console.log(`[Razorpay Webhook] Payment record for ${paymentId} not created yet by client. (Client will verify and create).`);
    }
  }

  res.status(200).json({ status: 'ok' });
});
