import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    bio: { type: String },
    specialties: [{ type: String }],
    phone: { type: String },
    email: { type: String },
    avatarUrl: { type: String },
    gallery: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    locationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    compensationType: { type: String, enum: ['SALARY', 'PER_SESSION'], default: 'SALARY' },
    compensationRate: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Trainer = mongoose.model('Trainer', trainerSchema);
export default Trainer;
