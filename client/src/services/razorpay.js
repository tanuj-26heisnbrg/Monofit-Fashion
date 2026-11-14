import api from "./api.js";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });

export async function beginRazorpayCheckout({
  orderId,
  prefill = {},
  onVerified,
  onDismiss,
  onError,
  onFailure,
}) {
  await loadRazorpay();
  const { data: gatewayOrder } = await api.post("/payments/create-order", {
    orderId,
  });
  const checkout = new window.Razorpay({
    key: gatewayOrder.keyId,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    order_id: gatewayOrder.gatewayOrderId,
    name: "MonoFit",
    prefill,
    handler: async (response) => {
      try {
        const { data: order } = await api.post("/payments/verify", {
          orderId,
          ...response,
        });
        await onVerified?.(order);
      } catch (error) {
        onError?.(error);
      }
    },
    modal: { ondismiss: onDismiss },
  });

  checkout.on("payment.failed", (response) => {
    onFailure?.(response?.error?.description || "Payment failed. Please try again.");
  });
  checkout.open();
}
