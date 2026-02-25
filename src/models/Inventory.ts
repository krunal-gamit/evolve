import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['AC', 'CCTV', 'Fan', 'Light', 'Furniture', 'Electronics', 'Other'] 
  },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  quantity: { type: Number, required: true, default: 1 },
  amount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Working', 'Under Maintenance', 'Broken', 'Retired'],
    default: 'Working'
  },
  purchaseDate: { type: Date },
  lastMaintenanceDate: { type: Date },
  notes: { type: String },
  serialNumber: { type: String },
  brand: { type: String },
  model: { type: String },
}, { timestamps: true });

delete mongoose.models.Inventory;
export default mongoose.model('Inventory', InventorySchema);
