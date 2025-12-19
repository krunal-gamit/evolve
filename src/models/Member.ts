import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);