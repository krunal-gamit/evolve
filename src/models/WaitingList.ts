import mongoose from 'mongoose';

const WaitingListSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  requestedDate: { type: Date, default: Date.now },
  startDate: { type: String, required: true },
  duration: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  upiCode: { type: String },
  dateTime: { type: String, required: true },
}, {
  timestamps: true,
});

export default mongoose.models.WaitingList || mongoose.model('WaitingList', WaitingListSchema);