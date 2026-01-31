import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  totalSeats: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export default mongoose.models.Location || mongoose.model('Location', LocationSchema);
