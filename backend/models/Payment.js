import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    groupId: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    amount: { type: Number, required: true },
    currency: { type: String },
    paymentMethod: { type: String, default: 'card' },
    cardBrand: { type: String },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    reference: { type: String },
    last4: { type: String },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    couponAmount: { type: Number, default: 0 },
    membershipUnits: { type: Number, default: 1 },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isVendorSale: { type: Boolean, default: false },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorSalePrice: { type: Number },
    vendorMargin: { type: Number },
    gymRevenue: { type: Number },
    isUAT: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
