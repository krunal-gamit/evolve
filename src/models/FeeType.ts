import mongoose from 'mongoose';

const FeeTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  duration: { type: String, required: true }, // e.g., "30 days", "1 month"
}, { timestamps: true });

delete mongoose.models.FeeType;
export default mongoose.model('FeeType', FeeTypeSchema);