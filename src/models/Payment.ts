import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['UPI', 'cash'], required: true },
  upiCode: { type: String }, // only if UPI
  dateTime: { type: Date, required: true },
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);