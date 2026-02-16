import mongoose from 'mongoose';

export type UserRole = 'Admin' | 'Manager' | 'Member';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Manager', 'Member'], required: true },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }], // Array of location IDs, empty means all locations
  qrCode: { type: String }, // For members, unique QR code
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

delete mongoose.models.User;
export default mongoose.model('User', UserSchema);