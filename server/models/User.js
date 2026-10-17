import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const addressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  pincode: String,
  state: String,
  city: String,
  line1: String,
  landmark: String,
});
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: String,
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true },
);
schema.pre("save", async function (next) {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.matches = function (pw) {
  return bcrypt.compare(pw, this.password);
};
export default mongoose.model("User", schema);
