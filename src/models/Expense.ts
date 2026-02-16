import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true, enum: ['Equipment', 'Maintenance', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Rent', 'Other'] },
  paidTo: { type: String, required: true },
  method: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], required: true },
  date: { type: Date, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
}, { timestamps: true });

delete mongoose.models.Expense;
export default mongoose.model('Expense', ExpenseSchema);