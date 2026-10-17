import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import ProductCard, { Skeleton } from "../components/ProductCard.jsx";

const F = ({ label, children }) => (
  <div>
    <label className="lbl">{label}</label>
    {children}
  </div>
);
export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .get("/categories")
      .then((r) => setCats(r.data))
      .catch(() => {});
  }, []);
  const key = sp.toString();
  useEffect(() => {
    setData(null);
    setErr("");
    api
      .get("/products?" + key)
      .then((r) => setData(r.data))
      .catch(() => setErr("Could not load products. Please try again."));
  }, [key]);
  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    n.delete("page");
    setSp(n);
  };
  const page = +sp.get("page") || 1;
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[220px_1fr] gap-8">
      <aside className="space-y-4">
        <F label="Category">
          <select
            className="inp"
            value={sp.get("category") || ""}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </F>
        <F label="Gender">
          <select
            className="inp"
            value={sp.get("gender") || ""}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">All</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
        </F>
        <F label="Size">
          <select
            className="inp"
            value={sp.get("size") || ""}
            onChange={(e) => set("size", e.target.value)}
          >
            <option value="">Any</option>
            {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </F>
        <div className="grid grid-cols-2 gap-2">
          <F label="Min ₹">
            <input
              className="inp"
              type="number"
              min="0"
              value={sp.get("minPrice") || ""}
              onChange={(e) => set("minPrice", e.target.value)}
            />
          </F>
          <F label="Max ₹">
            <input
              className="inp"
              type="number"
              min="0"
              value={sp.get("maxPrice") || ""}
              onChange={(e) => set("maxPrice", e.target.value)}
            />
          </F>
        </div>
        <F label="Discount">
          <select
            className="inp"
            value={sp.get("minDiscount") || ""}
            onChange={(e) => set("minDiscount", e.target.value)}
          >
            <option value="">Any</option>
            {[10, 20, 30, 50].map((d) => (
              <option key={d} value={d}>
                {d}% or more
              </option>
            ))}
          </select>
        </F>
        <F label="Sort by">
          <select
            className="inp"
            value={sp.get("sort") || ""}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="best">Best selling</option>
          </select>
        </F>
        <button className="btn-o w-full" onClick={() => setSp({})}>
          Clear filters
        </button>
      </aside>
      <section>
        <div className="text-sm text-neutral-600 mb-4">
          {data ? `${data.total} products` : "Loading…"}
          {sp.get("q") && ` for “${sp.get("q")}”`}
        </div>
        {err && (
          <p role="alert" className="text-red-700">
            {err}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {!data && !err ? (
            <Skeleton n={6} />
          ) : (
            data?.items.map((p) => <ProductCard key={p._id} p={p} />)
          )}
        </div>
        {data?.items.length === 0 && (
          <div className="py-20 text-center">
            <p>No products match these filters.</p>
            <button className="btn mt-4" onClick={() => setSp({})}>
              Clear filters
            </button>
          </div>
        )}
        {data?.pages > 1 && (
          <div className="flex justify-center gap-3 mt-10">
            <button
              className="btn-o"
              disabled={page <= 1}
              onClick={() =>
                setSp({ ...Object.fromEntries(sp), page: page - 1 })
              }
            >
              Previous
            </button>
            <span className="self-center text-sm">
              {page} / {data.pages}
            </span>
            <button
              className="btn-o"
              disabled={page >= data.pages}
              onClick={() =>
                setSp({ ...Object.fromEntries(sp), page: page + 1 })
              }
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
