import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  memberId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  examPrep: { type: String },
  password: { type: String }, // Password is stored in User model for auth
  createdAt: { type: Date, default: Date.now },
});

delete mongoose.models.Member;
export default mongoose.model('Member', MemberSchema);