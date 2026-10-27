import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { inr } from "../services/api.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Product() {
  const { slug } = useParams();
  const { add } = useCart();
  const { user, wishlist, toggleWish } = useAuth();
  const [d, setD] = useState(null);
  const [img, setImg] = useState(0);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setD(null);
    setImg(0);
    setSize("");
    setQty(1);
    setMissing(false);
    api
      .get("/products/" + slug)
      .then((r) => {
        setD(r.data);
        document.title = r.data.product.name + " | MonoFit";
      })
      .catch(() => setMissing(true));
  }, [slug]);
  if (missing)
    return (
      <p className="max-w-7xl mx-auto px-4 py-20">
        This product is unavailable.
      </p>
    );
  if (!d)
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse grid md:grid-cols-2 gap-8">
        <div className="aspect-[3/4] bg-neutral-200" />
        <div className="h-40 bg-neutral-200" />
      </div>
    );
  const p = d.product;
  const sel = p.sizes.find((s) => s.size === size);
  const addIt = () => {
    if (!size) return toast.error("Select a size first");
    add(p, size, qty);
    toast.success("Added to cart");
  };
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="flex flex-col-reverse md:flex-row gap-3">
          <div className="flex md:flex-col gap-2">
            {p.images.map((im, i) => (
              <button
                key={im.url}
                onClick={() => setImg(i)}
                className={`w-16 h-20 border ${i === img ? "border-black" : "border-transparent"}`}
              >
                <img
                  src={im.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setZoom(true)}
            className="flex-1 aspect-[3/4] bg-neutral-100 cursor-zoom-in"
            aria-label="Enlarge image"
          >
            {p.images[img] ? (
              <img
                src={p.images[img].url}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-neutral-400">No photo</span>
            )}
          </button>
        </div>
        <div>
          <p className="text-xs text-neutral-500">
            {p.category.name} · {p.gender} · SKU {p.sku}
          </p>
          <h1 className="font-display text-3xl mt-2">{p.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-medium">{inr(p.price)}</span>
            {p.mrp > p.price && (
              <>
                <span className="line-through text-neutral-500">
                  {inr(p.mrp)}
                </span>
                <span className="text-sm font-medium">
                  {p.discountPct}% OFF
                </span>
              </>
            )}
          </div>
          <p className="mt-6 text-sm text-neutral-700 whitespace-pre-line">
            {p.description}
          </p>
          <div className="mt-6">
            <div className="lbl">Size</div>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button
                  key={s.size}
                  disabled={s.stock === 0}
                  onClick={() => {
                    setSize(s.size);
                    setQty(1);
                  }}
                  className={`min-w-12 px-3 py-2 border text-sm ${size === s.size ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" : "border-neutral-300"} disabled:opacity-30 disabled:line-through`}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {sel && (
              <p className="text-xs mt-2 text-neutral-600">
                {sel.stock <= 5 ? `Only ${sel.stock} left` : "In stock"}
              </p>
            )}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-neutral-300">
              <button
                className="px-3 py-2"
                aria-label="Decrease"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                className="px-3 py-2"
                aria-label="Increase"
                onClick={() => setQty(Math.min(sel?.stock || 1, qty + 1))}
              >
                +
              </button>
            </div>
            <button
              className="btn flex-1"
              onClick={addIt}
              disabled={p.totalStock === 0}
            >
              {p.totalStock === 0 ? "Out of stock" : "Add to cart"}
            </button>
            <button
              className="btn-o"
              onClick={() =>
                user ? toggleWish(p._id) : toast("Log in to save items")
              }
            >
              {wishlist.includes(p._id) ? "Saved" : "Save"}
            </button>
          </div>
          <div className="mt-8 text-sm text-neutral-600 space-y-1 border-t border-neutral-200 pt-4">
            <p>Free shipping on orders above ₹999.</p>
            <p>Returns and exchanges: see the returns page for eligibility.</p>
          </div>
        </div>
      </div>
      {d.related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {d.related.map((r) => (
              <ProductCard key={r._id} p={r} />
            ))}
          </div>
        </section>
      )}
      {zoom && (
        <div
          className="fixed inset-0 bg-black/90 z-50 grid place-items-center p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={p.images[img]?.url}
            alt={p.name}
            className="max-h-full max-w-full"
          />
        </div>
      )}
    </div>
  );
}
