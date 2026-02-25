import mongoose from 'mongoose';

const GrievanceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['AC', 'Fan', 'Lights', 'Furniture', 'Washroom', 'Internet', 'Noise', 'Cleanliness', 'Safety', 'Other'] 
  },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'], 
    default: 'Pending' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  resolution: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  attachments: [{ type: String }], // URLs to attachments if any
}, { timestamps: true });

delete mongoose.models.Grievance;
export default mongoose.model('Grievance', GrievanceSchema);
