import mongoose from "mongoose";
export default mongoose.model(
  "Category",
  new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      slug: { type: String, required: true, unique: true },
      active: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);
