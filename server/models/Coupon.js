import mongoose from 'mongoose';
export default mongoose.model('Coupon', new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 1 },
  minOrder: { type: Number, default: 0 },
  maxDiscount: Number,
  startsAt: Date, expiresAt: Date,
  usageLimit: Number, perUserLimit: { type: Number, default: 1 },
  used: { type: Number, default: 0 },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  active: { type: Boolean, default: true },
}, { timestamps: true }));
