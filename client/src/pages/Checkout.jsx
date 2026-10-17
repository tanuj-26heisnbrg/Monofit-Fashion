import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errMsg, inr } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const loadRzp = () =>
  new Promise((ok, no) => {
    if (window.Razorpay) return ok();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = ok;
    s.onerror = no;
    document.body.appendChild(s);
  });

export default function Checkout() {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const nav = useNavigate();
  const [a, setA] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    pincode: "",
    state: "",
    city: "",
    line1: "",
    landmark: "",
  });
  const [method, setMethod] = useState("cod");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const lines = items.map((i) => ({
    productId: i.productId,
    size: i.size,
    qty: i.qty,
  }));
  const getQuote = (code) =>
    api
      .post("/orders/quote", { items: lines, couponCode: code || undefined })
      .then((r) => {
        setQuote(r.data);
        setApplied(code || "");
        return true;
      })
      .catch((e) => {
        toast.error(errMsg(e));
        return false;
      });
  useEffect(() => {
    if (user && items.length) getQuote(applied);
  }, []); // eslint-disable-line
  if (!user)
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <p>Please log in to check out.</p>
        <Link to="/login?next=/checkout" className="btn mt-4">
          Log in
        </Link>
      </div>
    );
  if (!items.length)
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <p>Your cart is empty.</p>
        <Link to="/shop" className="btn mt-4">
          Shop now
        </Link>
      </div>
    );
  const f = (k) => ({
    value: a[k],
    onChange: (e) => setA({ ...a, [k]: e.target.value }),
    className: "inp",
  });

  const place = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data: order } = await api.post("/orders", {
        items: lines,
        couponCode: applied || undefined,
        address: a,
        method,
        idempotencyKey: key.current,
      });
      if (method === "online") {
        await loadRzp();
        const { data: g } = await api.post("/payments/create-order", {
          orderId: order._id,
        });
        const rz = new window.Razorpay({
          key: g.keyId,
          amount: g.amount,
          currency: g.currency,
          order_id: g.gatewayOrderId,
          name: "MonoFit",
          prefill: { name: a.name, contact: a.phone, email: a.email },
          handler: async (r) => {
            try {
              await api.post("/payments/verify", { orderId: order._id, ...r });
              clear();
              nav("/order-success/" + order._id);
            } catch (er) {
              toast.error(errMsg(er));
            }
          },
          modal: {
            ondismiss: () => {
              setBusy(false);
              toast(
                "Payment not completed. Your order is saved; cancel it from My orders if you changed your mind.",
              );
            },
          },
        });
        rz.open();
        return;
      }
      clear();
      nav("/order-success/" + order._id);
    } catch (er) {
      toast.error(errMsg(er));
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={place}
      className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-[1fr_320px] gap-10"
    >
      <div>
        <h1 className="font-display text-3xl mb-6">Checkout</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="lbl" htmlFor="n">
              Full name
            </label>
            <input id="n" required {...f("name")} />
          </div>
          <div>
            <label className="lbl" htmlFor="p">
              Mobile number
            </label>
            <input
              id="p"
              required
              pattern="[6-9][0-9]{9}"
              title="10-digit mobile number"
              {...f("phone")}
            />
          </div>
          <div>
            <label className="lbl" htmlFor="e">
              Email
            </label>
            <input id="e" type="email" {...f("email")} />
          </div>
          <div>
            <label className="lbl" htmlFor="z">
              PIN code
            </label>
            <input
              id="z"
              required
              pattern="[0-9]{6}"
              title="6-digit PIN"
              {...f("pincode")}
            />
          </div>
          <div>
            <label className="lbl" htmlFor="s">
              State
            </label>
            <input id="s" required {...f("state")} />
          </div>
          <div>
            <label className="lbl" htmlFor="c">
              City
            </label>
            <input id="c" required {...f("city")} />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl" htmlFor="l">
              House, building and street
            </label>
            <input id="l" required minLength={5} {...f("line1")} />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl" htmlFor="m">
              Landmark (optional)
            </label>
            <input id="m" {...f("landmark")} />
          </div>
        </div>
        <fieldset className="mt-8">
          <legend className="lbl">Payment</legend>
          <label className="flex gap-2 items-center py-1 text-sm">
            <input
              type="radio"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
            />{" "}
            Cash on delivery
          </label>
          <label className="flex gap-2 items-center py-1 text-sm">
            <input
              type="radio"
              checked={method === "online"}
              onChange={() => setMethod("online")}
            />{" "}
            Pay online (needs payment gateway setup)
          </label>
        </fieldset>
      </div>
      <aside className="border border-neutral-200 p-5 h-fit text-sm space-y-2">
        {items.map((i) => (
          <div key={i.productId + i.size} className="flex justify-between">
            <span>
              {i.name} ({i.size}) × {i.qty}
            </span>
            <span>{inr(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-3 border-t border-neutral-200">
          <input
            aria-label="Coupon code"
            className="inp"
            placeholder="Coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <button
            type="button"
            className="btn-o"
            onClick={() =>
              getQuote(coupon.trim()).then(
                (ok) => ok && coupon && toast.success("Coupon applied"),
              )
            }
          >
            Apply
          </button>
        </div>
        {quote ? (
          <>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{inr(quote.subtotal)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>−{inr(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{quote.shipping ? inr(quote.shipping) : "Free"}</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-neutral-200">
              <span>Total</span>
              <span>{inr(quote.total)}</span>
            </div>
          </>
        ) : (
          <p className="text-neutral-500">Calculating total…</p>
        )}
        <button className="btn w-full mt-2" disabled={busy || !quote}>
          {busy
            ? "Placing order…"
            : method === "cod"
              ? "Place order"
              : "Pay now"}
        </button>
      </aside>
    </form>
  );
}
