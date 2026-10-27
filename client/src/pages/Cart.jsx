import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { inr } from "../services/api.js";

export default function Cart() {
  const { items, setQty, remove, clear, subtotal } = useCart();
  if (!items.length)
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <p>Your cart is empty.</p>
        <Link to="/shop" className="btn mt-4">
          Start shopping
        </Link>
      </div>
    );
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl">Cart</h1>
        <button onClick={clear} className="text-sm underline">
          Clear cart
        </button>
      </div>
      <div className="divide-y divide-neutral-200 border-y border-neutral-200">
        {items.map((i) => (
          <div key={i.productId + i.size} className="flex gap-4 py-4">
            <div className="w-20 h-28 bg-neutral-100 shrink-0">
              {i.image && (
                <img
                  src={i.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 text-sm">
              <Link to={"/product/" + i.slug} className="font-medium">
                {i.name}
              </Link>
              <p className="text-neutral-600">
                Size {i.size} · {inr(i.price)}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center border border-neutral-300">
                  <button
                    className="px-3 py-1"
                    aria-label="Decrease"
                    onClick={() => setQty(i.productId, i.size, i.qty - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{i.qty}</span>
                  <button
                    className="px-3 py-1"
                    aria-label="Increase"
                    onClick={() => setQty(i.productId, i.size, i.qty + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-900 hover:text-white hover:border-neutral-900 dark:hover:bg-white dark:hover:text-black dark:hover:border-white"
                  onClick={() => remove(i.productId, i.size)}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="text-sm font-medium">{inr(i.price * i.qty)}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 ml-auto max-w-xs text-sm">
        <div className="flex justify-between font-medium text-base">
          <span>Subtotal</span>
          <span>{inr(subtotal)}</span>
        </div>
        <p className="text-neutral-500 mt-1">
          Shipping and coupons are calculated at checkout.
        </p>
        <Link to="/checkout" className="btn w-full mt-4">
          Checkout
        </Link>
      </div>
    </div>
  );
}
