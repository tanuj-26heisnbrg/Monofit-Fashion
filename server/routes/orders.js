import { Router } from "express";
import { z } from "zod";
import Order from "../models/Order.js";
import { protect, httpError } from "../middleware/auth.js";
import { wrap } from "../utils/helpers.js";
import {
  createOrder,
  priceCart,
  cancelOrder,
} from "../services/orderService.js";
const r = Router();
const items = z
  .array(
    z.object({
      productId: z.string(),
      size: z.string(),
      qty: z.number().int().min(1).max(10),
    }),
  )
  .min(1);
const trackLookup = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("order"),
    orderNumber: z.string().trim().min(1).max(40),
    email: z.string().trim().email().max(254),
  }),
  z.object({
    mode: z.literal("tracking"),
    trackingId: z.string().trim().min(1).max(100),
  }),
]);
const publicTrackingDetails = (order) => ({
  orderNumber: order.orderNumber,
  status: order.status,
  tracking: order.tracking,
  history: order.history,
});
r.post(
  "/track",
  wrap(async (req, res) => {
    const lookup = trackLookup.parse(req.body);
    let order;

    if (lookup.mode === "order") {
      order = await Order.findOne({
        orderNumber: lookup.orderNumber,
      }).populate("user", "email");
      const submittedEmail = lookup.email.toLowerCase();
      if (
        !order ||
        ![order.address?.email, order.user?.email]
          .filter(Boolean)
          .some((email) => email.toLowerCase() === submittedEmail)
      ) {
        throw httpError(404, "Order not found. Check the order number and email.");
      }
    } else {
      order = await Order.findOne({
        "tracking.trackingId": lookup.trackingId,
      });
      if (!order) throw httpError(404, "Tracking number not found.");
    }

    res.json(publicTrackingDetails(order));
  }),
);
r.use(protect);
const address = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  pincode: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  state: z.string().min(2),
  city: z.string().min(2),
  line1: z.string().min(5),
  landmark: z.string().optional(),
});
r.post(
  "/quote",
  wrap(async (req, res) => {
    const b = z
      .object({ items, couponCode: z.string().optional() })
      .parse(req.body);
    const { pricing } = await priceCart(
      b.items,
      b.couponCode || undefined,
      req.user._id,
    );
    res.json(pricing);
  }),
);
r.post(
  "/",
  wrap(async (req, res) => {
    const b = z
      .object({
        items,
        couponCode: z.string().optional(),
        address,
        method: z.enum(["cod", "online"]),
        idempotencyKey: z.string().max(80).optional(),
      })
      .parse(req.body);
    if (b.method === "online" && !process.env.PAYMENT_GATEWAY_KEY_ID)
      throw httpError(
        400,
        "Online payment is not available yet. Please choose Cash on Delivery",
      );
    const order = await createOrder({
      user: req.user,
      rawItems: b.items,
      couponCode: b.couponCode || undefined,
      address: b.address,
      method: b.method,
      idempotencyKey: b.idempotencyKey,
    });
    res.status(201).json(order);
  }),
);
r.get(
  "/my-orders",
  wrap(async (req, res) =>
    res.json(await Order.find({ user: req.user._id }).sort("-createdAt")),
  ),
);
r.get(
  "/:orderId",
  wrap(async (req, res) => {
    const o = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });
    if (!o) throw httpError(404, "Order not found");
    res.json(o);
  }),
);
r.post(
  "/:orderId/cancel",
  wrap(async (req, res) => {
    const o = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });
    if (!o) throw httpError(404, "Order not found");
    if (!["placed", "confirmed", "processing"].includes(o.status))
      throw httpError(400, "This order can no longer be cancelled");
    await cancelOrder(o, "Cancelled by customer");
    res.json(o);
  }),
);
export default r;
