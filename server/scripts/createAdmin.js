// One-time bootstrap: npm run create-admin (reads ADMIN_* from .env). No public admin signup exists.
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
await mongoose.connect(process.env.MONGODB_URI);
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env");
  process.exit(1);
}
const ex = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
if (ex) {
  ex.role = "admin";
  await ex.save();
  console.log("Existing user promoted to admin");
} else {
  await User.create({
    name: ADMIN_NAME || "Admin",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });
  console.log("Admin created: " + ADMIN_EMAIL);
}
await mongoose.disconnect();
