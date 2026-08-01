import PaymentGatewayInterface from './PaymentGatewayInterface.js';
import Setting from '../../models/Setting.js';

class GenericBankGateway extends PaymentGatewayInterface {
  constructor(providerName) {
    super();
    this.providerName = providerName;
    this.keyId = null;
    this.keySecret = null;
    this.webhookSecret = null;
  }

  async _initialize() {
    const gatewaySettings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (gatewaySettings?.value?.[this.providerName]) {
      this.keyId = gatewaySettings.value[this.providerName].keyId;
      this.keySecret = gatewaySettings.value[this.providerName].keySecret;
      this.webhookSecret = gatewaySettings.value[this.providerName].webhookSecret;
    }
    if (!this.keyId || !this.keySecret) {
      throw new Error(`${this.providerName} credentials not configured`);
    }
  }

  async getPublicKey() {
    await this._initialize();
    return { keyId: this.keyId };
  }

  async createOrder({ amount, currency, receipt, notes }) {
    await this._initialize();
    return {
      orderId: `${this.providerName}_order_${Date.now()}`,
      amount: amount,
      currency: currency || 'USD',
      clientSecret: `mock_${this.providerName}_secret`,
      providerData: { status: 'created' }
    };
  }

  async verifyPayment({ orderId, paymentId, signature }) {
    await this._initialize();
    return true; 
  }

  async parseWebhook(req) {
    return { 
        isValid: true, 
        event: 'payment.success', 
        orderId: req.body?.orderId || 'mock', 
        paymentId: req.body?.paymentId || 'mock', 
        websiteSource: this.providerName 
    };
  }
}

export default GenericBankGateway;
