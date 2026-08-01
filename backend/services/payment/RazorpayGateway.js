import PaymentGatewayInterface from './PaymentGatewayInterface.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Setting from '../../models/Setting.js';

class RazorpayGateway extends PaymentGatewayInterface {
  constructor() {
    super();
    this.razorpayInstance = null;
    this.keyId = null;
    this.keySecret = null;
    this.webhookSecret = null;
  }

  async _initialize() {
    let key_id = process.env.RAZORPAY_KEY_ID;
    let key_secret = process.env.RAZORPAY_KEY_SECRET;
    let webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const gatewaySettings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (gatewaySettings && gatewaySettings.value && gatewaySettings.value.razorpay) {
      if (gatewaySettings.value.razorpay.keyId) key_id = gatewaySettings.value.razorpay.keyId;
      if (gatewaySettings.value.razorpay.keySecret) key_secret = gatewaySettings.value.razorpay.keySecret;
      if (gatewaySettings.value.razorpay.webhookSecret) webhook_secret = gatewaySettings.value.razorpay.webhookSecret;
    } else {
      // Fallback to legacy razorpay_settings if payment_gateway_settings is not yet set
      const razorpaySetting = await Setting.findOne({ key: 'razorpay_settings' });
      if (razorpaySetting && razorpaySetting.value) {
        if (razorpaySetting.value.keyId) key_id = razorpaySetting.value.keyId;
        if (razorpaySetting.value.keySecret) key_secret = razorpaySetting.value.keySecret;
        if (razorpaySetting.value.webhookSecret) webhook_secret = razorpaySetting.value.webhookSecret;
      }
    }

    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys are not configured in environment variables or database settings');
    }

    this.keyId = key_id;
    this.keySecret = key_secret;
    this.webhookSecret = webhook_secret;

    if (!this.razorpayInstance || this.razorpayInstance.key_id !== key_id || this.razorpayInstance.key_secret !== key_secret) {
      this.razorpayInstance = new Razorpay({
        key_id,
        key_secret
      });
    }
  }

  async getPublicKey() {
    await this._initialize();
    return { keyId: this.keyId };
  }

  async createOrder({ amount, currency, receipt, notes }) {
    await this._initialize();

    // Razorpay expects amount in paise (smallest currency unit, e.g. 100 paise = 1 INR)
    const options = {
      amount: Math.round(amount * 100),
      currency: (currency || 'INR').toUpperCase(),
      receipt: receipt || `receipt_order_${Date.now()}`,
      notes: notes || {
        website_source: "JTS Kids Gym",
        description: "Kids Fitness Gym Booking & Membership Payment"
      }
    };

    try {
      const order = await this.razorpayInstance.orders.create(options);
      return {
        orderId: order.id,
        amount: order.amount / 100, // Return standard format
        currency: order.currency,
        providerData: order
      };
    } catch (error) {
      throw new Error(error.message || 'Razorpay order creation failed');
    }
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    await this._initialize();

    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  }

  async parseWebhook(req) {
    await this._initialize();

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      throw new Error('Webhook signature header missing');
    }

    if (!this.webhookSecret) {
      throw new Error('Razorpay Webhook Secret is not configured');
    }

    // Get raw body (requires express.json verify middleware)
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const { event, payload } = req.body;
    const paymentEntity = payload?.payment?.entity;
    
    return {
      isValid: true,
      event,
      paymentId: paymentEntity?.id,
      orderId: paymentEntity?.order_id,
      websiteSource: paymentEntity?.notes?.website_source,
      rawPayload: payload
    };
  }
}

export default RazorpayGateway;
