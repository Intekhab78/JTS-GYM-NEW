import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyName: { type: String },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isUAT: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
