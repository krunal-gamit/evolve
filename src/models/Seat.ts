import mongoose from 'mongoose';

const SeatSchema = new mongoose.Schema({
  seatNumber: { type: Number, required: true, unique: true },
  status: { type: String, enum: ['vacant', 'occupied'], default: 'vacant' },
  assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
});

export default mongoose.models.Seat || mongoose.model('Seat', SeatSchema);