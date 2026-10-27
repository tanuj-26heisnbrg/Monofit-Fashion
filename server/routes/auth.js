import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { sign, protect, httpError } from "../middleware/auth.js";
import { wrap } from "../utils/helpers.js";
const r = Router();
const reg = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional(),
});
const out = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
});
r.post(
  "/register",
  wrap(async (req, res) => {
    const d = reg.parse(req.body);
    if (await User.findOne({ email: d.email }))
      throw httpError(409, "Email already registered");
    const u = await User.create({ ...d, role: "customer" });
    res.status(201).json({ token: sign(u._id), user: out(u) });
  }),
);
r.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);
    const u = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!u || !(await u.matches(password)))
      throw httpError(401, "Incorrect email or password");
    res.json({ token: sign(u._id), user: out(u) });
  }),
);
r.post("/logout", (req, res) => res.json({ message: "Logged out" })); // stateless JWT: client discards token
r.get("/me", protect, (req, res) =>
  res.json({
    user: out(req.user),
    wishlist: req.user.wishlist,
    addresses: req.user.addresses,
  }),
);
r.get(
  "/wishlist",
  protect,
  wrap(async (req, res) => {
    const products = await Product.find({
      _id: { $in: req.user.wishlist },
      status: "published",
    }).populate("category", "name slug");
    const byId = new Map(products.map((product) => [String(product._id), product]));
    res.json(
      req.user.wishlist
        .map((id) => byId.get(String(id)))
        .filter(Boolean),
    );
  }),
);
r.post(
  "/wishlist/:id",
  protect,
  wrap(async (req, res) => {
    const has = req.user.wishlist.some((x) => String(x) === req.params.id);
    req.user.wishlist = has
      ? req.user.wishlist.filter((x) => String(x) !== req.params.id)
      : [...req.user.wishlist, req.params.id];
    await req.user.save();
    res.json({ wishlist: req.user.wishlist });
  }),
);
// Forgot/reset password need an email service: intentionally pending until SMTP is configured.
r.post("/forgot-password", (req, res) =>
  res
    .status(501)
    .json({ message: "Password reset email is not configured yet" }),
);
r.post("/reset-password", (req, res) =>
  res
    .status(501)
    .json({ message: "Password reset email is not configured yet" }),
);
export default r;
