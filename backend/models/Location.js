import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    phone: { type: String },
    email: { type: String },
    timezone: { type: String, default: 'Asia/Dubai' },
    imageUrl: { type: String },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    isOnline: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0 }, paymentSettings: { type: Object, default: { cash: true, coupon: true, voucher: true, card: { visa: true, mastercard: true, amex: true, discover: false, unionpay: false, jcb: false, rupay: false, classic: false, gold: false, platinum: false, titanium: false, signature_visa: false, infinite_visa: false, world_mastercard: false, world_elite_mastercard: false, standard: false, business: false, corporate: false, student: false, secured: false, rewards: false, cashback: false, travel: false, premium: false, other: false } } }
  },
  { timestamps: true }
);


const Location = mongoose.model('Location', locationSchema);
export default Location;
