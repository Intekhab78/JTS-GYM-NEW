import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    domains: [{ type: String, lowercase: true, trim: true }], // e.g. 'kidsgym.com', 'localhost'
    theme: {
      primaryColor: { type: String, default: '#0284c7' }, // default blue
      secondaryColor: { type: String, default: '#0ea5e9' },
      logoUrl: { type: String },
      faviconUrl: { type: String },
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    contactEmail: { type: String },
    contactPhone: { type: String }, paymentSettings: { type: Object, default: { cash: true, coupon: true, voucher: true, card: { visa: true, mastercard: true, amex: true, discover: false, unionpay: false, jcb: false, rupay: false, classic: false, gold: false, platinum: false, titanium: false, signature_visa: false, infinite_visa: false, world_mastercard: false, world_elite_mastercard: false, standard: false, business: false, corporate: false, student: false, secured: false, rewards: false, cashback: false, travel: false, premium: false, other: false } } }
  },
  { timestamps: true }
);

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
