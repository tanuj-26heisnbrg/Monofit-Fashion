import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import Order from "../models/Order.js";
import {
  createRazorpayClient,
  getRazorpayCredentials,
} from "../config/razorpay.js";
import { protect, httpError } from "../middleware/auth.js";
import { wrap } from "../utils/helpers.js";
const r = Router();
const signatureSchema = z.string().regex(/^[a-f\d]{64}$/i);
const eq = (a, b) => {
  if (!signatureSchema.safeParse(a).success || !signatureSchema.safeParse(b).success)
    return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
};

const amountInPaise = (order) => Math.round(Number(order.pricing.total) * 100);

async function fetchPayment(paymentId, client) {
  try {
    return await client.payments.fetch(paymentId);
  } catch {
    throw httpError(502, "Could not confirm payment status with Razorpay");
  }
}

const markPaid = async (order, paymentId) => {
  if (["paid", "refunded"].includes(order.payment.status)) return order;
  if (
    order.payment.status === "refund_pending" &&
    order.payment.gatewayPaymentId === paymentId
  )
    return order;
  if (
    order.payment.gatewayPaymentId &&
    order.payment.gatewayPaymentId !== paymentId
  )
    return order;

  const needsRefund = ["cancelled", "returned"].includes(order.status);
  order.payment.status = needsRefund ? "refund_pending" : "paid";
  order.payment.gatewayPaymentId = paymentId;
  order.history.push({
    status: order.status,
    note: needsRefund
      ? "Payment captured after order cancellation; refund required"
      : "Payment received",
  });
  return order.save();
};

const markFailed = async (order, paymentId) => {
  if (["paid", "refund_pending", "refunded"].includes(order.payment.status))
    return order;
  if (["cancelled", "returned"].includes(order.status)) return order;
  const note = `Payment attempt ${paymentId} failed`;
  if (order.history.some((entry) => entry.note === note)) return order;
  order.payment.status = "failed";
  order.history.push({ status: order.status, note });
  return order.save();
};
r.post(
  "/create-order",
  protect,
  wrap(async (req, res) => {
    const { orderId } = z
      .object({ orderId: z.string().min(1).max(80) })
      .parse(req.body);
    const { keyId, keySecret } = getRazorpayCredentials();
    const client = createRazorpayClient();
    if (!keyId || !keySecret || !client)
      throw httpError(503, "Online payments are not configured");
    const o = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      "payment.method": "online",
    });
    if (!o) throw httpError(404, "Order not found");
    if (o.payment.status === "paid") throw httpError(400, "Order already paid");
    if (["cancelled", "returned"].includes(o.status))
      throw httpError(409, "This order can no longer be paid");
    const amount = amountInPaise(o);
    if (!Number.isSafeInteger(amount) || amount < 100)
      throw httpError(400, "Payment amount must be at least 100 paise");
    if (o.payment.gatewayOrderId) {
      return res.json({
        keyId,
        gatewayOrderId: o.payment.gatewayOrderId,
        order_id: o.payment.gatewayOrderId,
        amount,
        currency: "INR",
        orderNumber: o.orderNumber,
      });
    }
    let gatewayOrder;
    try {
      gatewayOrder = await client.orders.create({
        amount,
        currency: "INR",
        receipt: o.orderNumber,
      });
    } catch {
      throw httpError(500, "Razorpay could not create the payment order");
    }
    o.payment.gatewayOrderId = gatewayOrder.id;
    await o.save();
    res.json({
      keyId,
      gatewayOrderId: gatewayOrder.id,
      order_id: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      orderNumber: o.orderNumber,
    });
  }),
);
r.post(
  "/verify",
  protect,
  wrap(async (req, res) => {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = z
      .object({
        orderId: z.string().min(1).max(80),
        razorpay_order_id: z.string().min(1).max(80),
        razorpay_payment_id: z.string().min(1).max(80),
        razorpay_signature: signatureSchema,
      })
      .parse(req.body);
    const o = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!o || o.payment.gatewayOrderId !== razorpay_order_id)
      throw httpError(400, "Payment does not match this order");
    if (o.payment.status === "paid") return res.json(o);
    if (["cancelled", "returned"].includes(o.status))
      throw httpError(409, "This order can no longer be paid");
    const { keyId, keySecret } = getRazorpayCredentials();
    const client = createRazorpayClient();
    if (!keyId || !keySecret || !client)
      throw httpError(503, "Online payments are not configured");
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (!eq(expected, String(razorpay_signature || "")))
      throw httpError(400, "Payment verification failed");

    const payment = await fetchPayment(razorpay_payment_id, client);
    if (
      payment.id !== razorpay_payment_id ||
      payment.order_id !== o.payment.gatewayOrderId ||
      payment.amount !== amountInPaise(o) ||
      payment.currency !== "INR"
    )
      throw httpError(400, "Payment details do not match this order");
    if (payment.status !== "captured")
      throw httpError(
        409,
        "Payment is not captured yet. Your order will update after Razorpay confirms capture.",
      );

    res.json(await markPaid(o, razorpay_payment_id));
  }),
);
// Mounted with express.raw in server.js so the signature is checked against the exact body.
export const webhook = wrap(async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).end();
  if (!Buffer.isBuffer(req.body)) return res.status(400).end();
  const sig = String(req.headers["x-razorpay-signature"] || "");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");
  if (!eq(expected, sig)) return res.status(400).end();
  let ev;
  try {
    ev = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).end();
  }
  const p = ev?.payload?.payment?.entity;
  if (["payment.captured", "payment.failed"].includes(ev?.event)) {
    if (!p?.id || !p?.order_id) return res.status(400).end();
    const o = await Order.findOne({ "payment.gatewayOrderId": p.order_id });
    if (o && p.amount === amountInPaise(o) && p.currency === "INR") {
      if (ev.event === "payment.captured" && p.status === "captured")
        await markPaid(o, p.id);
      if (ev.event === "payment.failed" && p.status === "failed")
        await markFailed(o, p.id);
    } else if (o) {
      console.error("Razorpay webhook amount or currency mismatch", p.order_id);
    }
  }
  res.json({ ok: true });
});
export default r;
