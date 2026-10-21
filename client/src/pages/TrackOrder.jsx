import { useState } from "react";
import api, { errMsg } from "../services/api.js";

const statusLabel = (status) =>
  status.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

export default function TrackOrder() {
  const [mode, setMode] = useState("order");
  const [orderNumber, setOrderNumber] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setOrder(null);
    setError("");
    try {
      const { data } = await api.post("/orders/track", mode === "order"
        ? { mode, orderNumber, email }
        : { mode, trackingId });
      setOrder(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const trackingUrl = /^https?:\/\//i.test(order?.tracking?.url || "")
    ? order.tracking.url
    : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-display text-center text-3xl md:text-4xl">
        Track your order
      </h1>
      <div className="mt-10 grid grid-cols-2 border-b border-neutral-300">
        {[
          ["order", "Order Number"],
          ["tracking", "Tracking Number"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setOrder(null);
              setError("");
            }}
            className={`px-3 py-4 text-sm md:text-base ${
              mode === value
                ? "border-b-2 border-black font-medium"
                : "text-neutral-600"
            }`}
            aria-pressed={mode === value}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "order" ? (
          <>
            <div>
              <label className="sr-only" htmlFor="track-order-number">Order number</label>
              <input
                className="inp rounded-lg px-4 py-4"
                id="track-order-number"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="Order Number"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="track-email">Email</label>
              <input
                className="inp rounded-lg px-4 py-4"
                id="track-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email used for the order"
                autoComplete="email"
                required
              />
            </div>
          </>
        ) : (
          <div>
            <label className="sr-only" htmlFor="tracking-number">Tracking number</label>
            <input
              className="inp rounded-lg px-4 py-4"
              id="tracking-number"
              value={trackingId}
              onChange={(event) => setTrackingId(event.target.value)}
              placeholder="Tracking Number"
              autoComplete="off"
              required
            />
          </div>
        )}
        <button className="btn w-full rounded-lg py-4" type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Track"}
        </button>
      </form>

      {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}

      {order && (
        <section aria-live="polite" className="mt-8 border border-neutral-200 rounded-lg p-5">
          <h2 className="font-medium">Order {order.orderNumber}</h2>
          <p className="mt-2 text-sm">
            Status: <span className="font-medium">{statusLabel(order.status)}</span>
          </p>
          {order.tracking?.trackingId && (
            <p className="mt-2 text-sm">
              Courier: {order.tracking.courier || "Not specified"} · Tracking number:{" "}
              {trackingUrl ? (
                <a className="underline" href={trackingUrl} target="_blank" rel="noreferrer">
                  {order.tracking.trackingId}
                </a>
              ) : order.tracking.trackingId}
            </p>
          )}
          {order.history?.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium">Order updates</h3>
              <ol className="mt-2 space-y-2 text-sm text-neutral-600">
                {order.history.map((update, index) => (
                  <li key={`${update.status}-${update.at}-${index}`}>
                    {new Date(update.at).toLocaleString()} — {statusLabel(update.status)}
                    {update.note ? ` (${update.note})` : ""}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
      <p className="mt-4 text-right text-xs text-neutral-500">
        Order Number lookup needs the email used at checkout.
      </p>
    </main>
  );
}
