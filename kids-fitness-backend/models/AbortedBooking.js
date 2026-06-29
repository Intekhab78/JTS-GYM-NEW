import mongoose from 'mongoose';

const abortedBookingSchema = new mongoose.Schema(
  {
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    type: {
      type: String,
      enum: ['Cancel', 'Discard', 'Void'],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    // Optional context data about what they were trying to book
    attemptData: {
      customerName: String,
      customerEmail: String,
      customerPhone: String,
      bookingMode: String,
      className: String,
      amount: Number
    }
  },
  { timestamps: true }
);

const AbortedBooking = mongoose.model('AbortedBooking', abortedBookingSchema);
export default AbortedBooking;
