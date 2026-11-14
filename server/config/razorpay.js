import Razorpay from "razorpay";

export const getRazorpayCredentials = () => ({
  keyId: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY_ID,
  keySecret:
    process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_KEY_SECRET,
});

export const isRazorpayConfigured = () => {
  const { keyId, keySecret } = getRazorpayCredentials();
  return Boolean(keyId && keySecret);
};

export const createRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};
