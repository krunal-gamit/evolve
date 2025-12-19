import mongoose from 'mongoose';

const WaitingListSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  requestedDate: { type: Date, default: Date.now },
});

export default mongoose.models.WaitingList || mongoose.model('WaitingList', WaitingListSchema);