import mongoose from 'mongoose';

const SeatSchema = new mongoose.Schema({
  seatNumber: { type: Number, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  status: { type: String, enum: ['vacant', 'occupied'], default: 'vacant' },
  assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
}, {
  timestamps: true,
});

// Compound index for unique seat number per location
SeatSchema.index({ location: 1, seatNumber: 1 }, { unique: true });

export default mongoose.models.Seat || mongoose.model('Seat', SeatSchema);