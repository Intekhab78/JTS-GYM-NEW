import PaymentGatewayInterface from './PaymentGatewayInterface.js';
import Stripe from 'stripe';
import Setting from '../../models/Setting.js';

class StripeGateway extends PaymentGatewayInterface {
  constructor() {
    super();
    this.stripeInstance = null;
    this.keyId = null;
    this.keySecret = null;
    this.webhookSecret = null;
  }

  async _initialize() {
    let key_id = process.env.STRIPE_KEY_ID;
    let key_secret = process.env.STRIPE_KEY_SECRET;
    let webhook_secret = process.env.STRIPE_WEBHOOK_SECRET;

    const gatewaySettings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (gatewaySettings && gatewaySettings.value && gatewaySettings.value.stripe) {
      if (gatewaySettings.value.stripe.keyId) key_id = gatewaySettings.value.stripe.keyId;
      if (gatewaySettings.value.stripe.keySecret) key_secret = gatewaySettings.value.stripe.keySecret;
      if (gatewaySettings.value.stripe.webhookSecret) webhook_secret = gatewaySettings.value.stripe.webhookSecret;
    }

    if (!key_id || !key_secret) {
      throw new Error('Stripe API keys are not configured in environment variables or database settings');
    }

    this.keyId = key_id;
    this.keySecret = key_secret;
    this.webhookSecret = webhook_secret;

    if (!this.stripeInstance) {
      this.stripeInstance = new Stripe(key_secret);
    }
  }

  async getPublicKey() {
    await this._initialize();
    return { keyId: this.keyId };
  }

  async createOrder({ amount, currency, receipt, notes }) {
    await this._initialize();

    try {
      const paymentIntent = await this.stripeInstance.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects smallest currency unit
        currency: (currency || 'USD').toLowerCase(),
        metadata: {
          receipt: receipt || `receipt_order_${Date.now()}`,
          ...(notes || {})
        }
      });
      return {
        orderId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // standard format
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret, // Used for Stripe Elements on frontend
        providerData: paymentIntent
      };
    } catch (error) {
      throw new Error(error.message || 'Stripe order creation failed');
    }
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    // For Stripe Elements, payment verification mostly happens securely via webhook
    // Or we can just retrieve the payment intent to see if it's succeeded
    await this._initialize();
    try {
      const intent = await this.stripeInstance.paymentIntents.retrieve(orderId);
      return intent.status === 'succeeded';
    } catch (error) {
      return false;
    }
  }

  async parseWebhook(req) {
    await this._initialize();

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw new Error('Webhook signature header missing');
    }

    if (!this.webhookSecret) {
      throw new Error('Stripe Webhook Secret is not configured');
    }

    // Get raw body
    const rawBody = req.rawBody ? req.rawBody : JSON.stringify(req.body);

    try {
      const event = this.stripeInstance.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
      
      const paymentIntent = event.data.object;

      return {
        isValid: true,
        event: event.type,
        paymentId: paymentIntent.id, // For stripe, payment intent id is used often
        orderId: paymentIntent.id, 
        websiteSource: paymentIntent.metadata?.website_source,
        rawPayload: event
      };
    } catch (err) {
       throw new Error(`Webhook Error: ${err.message}`);
    }
  }
}

export default StripeGateway;
