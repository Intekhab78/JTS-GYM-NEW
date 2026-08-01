import RazorpayGateway from './RazorpayGateway.js';
import StripeGateway from './StripeGateway.js';
import PayPalGateway from './PayPalGateway.js';
import CCAvenueGateway from './CCAvenueGateway.js';
import GenericBankGateway from './GenericBankGateway.js';
import Setting from '../../models/Setting.js';

class PaymentFactory {
  /**
   * Get the active payment gateway instance.
   * @returns {Promise<import('./PaymentGatewayInterface.js').default>}
   */
  static async getGateway() {
    // The frontend currently saves provider in payment_gateway_settings.
    let settings = await Setting.findOne({ key: 'payment_gateway_settings' });
    if (!settings) {
      settings = await Setting.findOne({ key: 'razorpay_settings' });
    }
    const activeProvider = (settings?.value?.activeProvider) || (settings?.value?.provider) || process.env.ACTIVE_PAYMENT_GATEWAY || 'razorpay';

    switch (activeProvider.toLowerCase()) {
      case 'razorpay':
        return new RazorpayGateway();
      case 'stripe':
        return new StripeGateway();
      case 'paypal':
        return new PayPalGateway();
      case 'ccavenue':
        return new CCAvenueGateway();
      case 'chase':
      case 'bofa':
      case 'barclays':
      case 'citi':
      case 'wellsfargo':
        return new GenericBankGateway(activeProvider.toLowerCase());
      default:
        throw new Error(`Payment provider ${activeProvider} is not supported.`);
    }
  }
}

export default PaymentFactory;
