import PaymentGatewayInterface from './PaymentGatewayInterface.js';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import Setting from '../../models/Setting.js';

class PayPalGateway extends PaymentGatewayInterface {
  constructor() {
    super();
    this.client = null;
    this.keyId = null;
    this.keySecret = null;
    this.webhookSecret = null;
  }

  async _initialize() {
    let key_id = process.env.PAYPAL_CLIENT_ID;
    let key_secret = process.env.PAYPAL_CLIENT_SECRET;
    let webhook_secret = process.env.PAYPAL_WEBHOOK_ID; // PayPal uses webhook ID

    const gatewaySettings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (gatewaySettings && gatewaySettings.value && gatewaySettings.value.paypal) {
      if (gatewaySettings.value.paypal.keyId) key_id = gatewaySettings.value.paypal.keyId;
      if (gatewaySettings.value.paypal.keySecret) key_secret = gatewaySettings.value.paypal.keySecret;
      if (gatewaySettings.value.paypal.webhookSecret) webhook_secret = gatewaySettings.value.paypal.webhookSecret;
    }

    if (!key_id || !key_secret) {
      throw new Error('PayPal API keys are not configured in environment variables or database settings');
    }

    this.keyId = key_id;
    this.keySecret = key_secret;
    this.webhookSecret = webhook_secret;

    if (!this.client) {
      // In production, use checkoutNodeJssdk.core.LiveEnvironment
      let environment = new checkoutNodeJssdk.core.SandboxEnvironment(key_id, key_secret);
      this.client = new checkoutNodeJssdk.core.PayPalHttpClient(environment);
    }
  }

  async getPublicKey() {
    await this._initialize();
    return { keyId: this.keyId };
  }

  async createOrder({ amount, currency, receipt, notes }) {
    await this._initialize();

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: (currency || 'USD').toUpperCase(),
                value: amount.toString()
            },
            custom_id: notes ? JSON.stringify(notes) : ''
        }]
    });

    try {
      const order = await this.client.execute(request);
      return {
        orderId: order.result.id,
        amount: amount,
        currency: currency,
        providerData: order.result
      };
    } catch (error) {
      throw new Error(error.message || 'PayPal order creation failed');
    }
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    // For PayPal, we capture the order on the backend after client approves it.
    await this._initialize();
    
    // In our simplified verify, we can just check if order is completed.
    // Real capture would happen here or in a separate capture route.
    try {
      const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
      const order = await this.client.execute(request);
      return order.result.status === 'COMPLETED';
    } catch (error) {
      return false;
    }
  }

  async parseWebhook(req) {
    // PayPal webhook parsing is complex with SDK, often we just use raw payload checking or verify signature API
    // For this prototype, we'll implement a basic structure
    await this._initialize();
    
    const { event_type, resource } = req.body;
    
    let websiteSource = null;
    if (resource && resource.custom_id) {
       try {
           const parsed = JSON.parse(resource.custom_id);
           websiteSource = parsed.website_source;
       } catch (e) {}
    }

    return {
      isValid: true, // Assuming valid for now, in prod call PayPal verify webhook API
      event: event_type,
      paymentId: resource.id,
      orderId: resource.id,
      websiteSource: websiteSource,
      rawPayload: req.body
    };
  }
}

export default PayPalGateway;
