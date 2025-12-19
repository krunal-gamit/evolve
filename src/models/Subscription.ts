import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: String, required: true }, // e.g., "30 days", "2 months"
  totalAmount: { type: Number, required: true },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
});

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);