/**
 * Interface that all payment gateways must implement.
 */
class PaymentGatewayInterface {
  /**
   * Get the public key for the frontend SDK.
   * @returns {Promise<{ keyId: string, [key: string]: any }>}
   */
  async getPublicKey() {
    throw new Error('getPublicKey() must be implemented');
  }

  /**
   * Create an order/session in the payment gateway.
   * @param {Object} options
   * @param {number} options.amount - The amount in the main currency unit (e.g. INR, USD)
   * @param {string} [options.currency='INR']
   * @param {string} [options.receipt] - Unique receipt/reference ID
   * @param {Object} [options.notes] - Additional metadata
   * @returns {Promise<{ orderId: string, amount: number, currency: string, providerData: any }>}
   */
  async createOrder({ amount, currency, receipt, notes }) {
    throw new Error('createOrder() must be implemented');
  }

  /**
   * Verify the payment from the frontend or webhook callback.
   * @param {Object} data - Verification parameters specific to the provider
   * @returns {Promise<boolean>} - True if valid, false otherwise
   */
  async verifyPayment(data) {
    throw new Error('verifyPayment() must be implemented');
  }

  /**
   * Verify and parse the incoming webhook event.
   * @param {Object} req - The express request object
   * @returns {Promise<{ isValid: boolean, event: string, paymentId?: string, orderId?: string, websiteSource?: string, rawPayload: any }>}
   */
  async parseWebhook(req) {
    throw new Error('parseWebhook() must be implemented');
  }
}

export default PaymentGatewayInterface;
