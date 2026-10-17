import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["men", "women", "unisex"],
      required: true,
      index: true,
    },
    sku: { type: String, required: true, unique: true, trim: true },
    images: [{ url: String, publicId: String }],
    mrp: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 1 },
    discountPct: { type: Number, default: 0 },
    sizes: [
      {
        size: { type: String, required: true },
        stock: {
          type: Number,
          default: 0,
          min: [0, "Stock cannot be negative"],
        },
      },
    ],
    colors: [String],
    tags: [String],
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ name: "text", tags: "text", description: "text" });
schema.pre("validate", function (next) {
  if (this.price > this.mrp)
    return next(new Error("Selling price cannot exceed MRP"));
  this.discountPct = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  next();
});
schema.virtual("totalStock").get(function () {
  return this.sizes.reduce((a, s) => a + s.stock, 0);
});
schema.set("toJSON", { virtuals: true });
export default mongoose.model("Product", schema);
