import asyncHandler from 'express-async-handler';
import PaymentFactory from '../services/payment/PaymentFactory.js';
import Payment from '../models/Payment.js';

// @desc    Get active payment gateway config/public key
// @route   GET /api/payments/gateway/config
// @access  Public
export const getGatewayConfig = asyncHandler(async (req, res) => {
  const gateway = await PaymentFactory.getGateway();
  const config = await gateway.getPublicKey();
  
  // Also pass down the provider type so frontend knows which SDK to initialize
  res.json({
    provider: gateway.constructor.name.replace('Gateway', '').toLowerCase(),
    ...config
  });
});

// @desc    Create Payment Gateway Order
// @route   POST /api/payments/gateway/order
// @access  Protected/Public
export const createOrder = asyncHandler(async (req, res) => {
  const { amount, currency } = req.body;
  if (!amount) {
    res.status(400);
    throw new Error('Amount is required');
  }

  const gateway = await PaymentFactory.getGateway();
  
  const order = await gateway.createOrder({
    amount,
    currency,
    receipt: `receipt_order_${Date.now()}`,
    notes: {
      website_source: "JTS Kids Gym",
      description: "Kids Fitness Gym Booking & Membership Payment"
    }
  });

  res.status(201).json({
    success: true,
    order
  });
});

// @desc    Handle Webhook Events dynamically
// @route   POST /api/payments/gateway/webhook
// @access  Public
export const handleWebhook = asyncHandler(async (req, res) => {
  const gateway = await PaymentFactory.getGateway();
  
  let webhookData;
  try {
    webhookData = await gateway.parseWebhook(req);
  } catch (err) {
    res.status(400);
    throw new Error(err.message || 'Webhook parsing failed');
  }

  if (!webhookData.isValid) {
    res.status(400);
    throw new Error('Invalid webhook signature');
  }

  console.log(`[Gateway Webhook Received] Event: ${webhookData.event}`);

  // Segregate multi-website payments: Only process if it belongs to JTS Kids Gym
  const websiteSource = webhookData.websiteSource;

  if (websiteSource !== 'JTS Kids Gym') {
    console.log(`[Gateway Webhook] Skipped event for other website: ${websiteSource || 'Unknown'}`);
    return res.status(200).json({ status: 'ignored', message: 'Not matching website source' });
  }

  // Handle successful payment events
  // Razorpay fires payment.captured or order.paid, Stripe might fire checkout.session.completed
  const successEvents = ['payment.captured', 'order.paid', 'checkout.session.completed'];

  if (successEvents.includes(webhookData.event)) {
    const paymentId = webhookData.paymentId;
    const orderId = webhookData.orderId;
    
    console.log(`[Gateway Webhook] Payment Successful! Payment ID: ${paymentId}, Order ID: ${orderId}`);
    
    if (paymentId) {
      // Find the payment record by reference
      let payment = await Payment.findOne({ reference: paymentId });
      if (payment) {
        if (payment.status === 'pending') {
          payment.status = 'paid';
          await payment.save();
          console.log(`[Gateway Webhook] Updated existing payment ${paymentId} status to paid.`);
        }
      } else {
        console.log(`[Gateway Webhook] Payment record for ${paymentId} not created yet by client. (Client will verify and create).`);
      }
    }
  }

  res.status(200).json({ status: 'ok' });
});
