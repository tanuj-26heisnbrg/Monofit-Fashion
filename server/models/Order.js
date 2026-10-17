import mongoose from "mongoose";
export const STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
];
const schema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        sku: String,
        image: String,
        size: String,
        qty: Number,
        mrp: Number,
        price: Number,
      },
    ],
    address: {
      name: String,
      phone: String,
      email: String,
      pincode: String,
      state: String,
      city: String,
      line1: String,
      landmark: String,
    },
    pricing: {
      subtotal: Number,
      discount: Number,
      shipping: Number,
      total: Number,
    },
    couponCode: String,
    payment: {
      method: { type: String, enum: ["cod", "online"], required: true },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
        default: "pending",
      },
      gatewayOrderId: String,
      gatewayPaymentId: String,
    },
    status: { type: String, enum: STATUSES, default: "placed", index: true },
    stockRestored: { type: Boolean, default: false },
    tracking: { courier: String, trackingId: String, url: String },
    history: [
      { status: String, note: String, at: { type: Date, default: Date.now } },
    ],
  },
  { timestamps: true },
);
export default mongoose.model("Order", schema);
