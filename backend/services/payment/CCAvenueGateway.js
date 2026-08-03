import PaymentGatewayInterface from './PaymentGatewayInterface.js';
import Setting from '../../models/Setting.js';

class CCAvenueGateway extends PaymentGatewayInterface {
  constructor() {
    super();
    this.merchantId = null;
    this.accessCode = null;
    this.workingKey = null;
  }

  async _initialize() {
    const gatewaySettings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (gatewaySettings?.value?.ccavenue) {
      this.merchantId = gatewaySettings.value.ccavenue.merchantId;
      this.accessCode = gatewaySettings.value.ccavenue.accessCode;
      this.workingKey = gatewaySettings.value.ccavenue.workingKey;
    }
    if (!this.merchantId || !this.workingKey) {
      throw new Error('CCAvenue credentials not configured');
    }
  }

  async getPublicKey() {
    await this._initialize();
    return { merchantId: this.merchantId, accessCode: this.accessCode };
  }

  async createOrder({ amount, currency, receipt, notes }) {
    await this._initialize();
    // In a real CCAvenue integration, you would encrypt the order data and return the encrypted payload.
    // For now, we mock the order creation.
    return {
      orderId: `cca_order_${Date.now()}`,
      amount: amount,
      currency: currency || 'INR',
      clientSecret: 'mock_ccavenue_enc_request',
      providerData: { status: 'created' }
    };
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    await this._initialize();
    // Real CCAvenue verification involves decrypting the response with workingKey.
    return true; // Mock success
  }

  async parseWebhook(req) {
    // CCAvenue typically uses a return URL rather than webhooks, but we implement interface
    return { 
        isValid: true, 
        event: 'payment.success', 
        orderId: req.body?.order_id || 'mock', 
        paymentId: req.body?.tracking_id || 'mock', 
        websiteSource: 'ccavenue' 
    };
  }
}

export default CCAvenueGateway;
