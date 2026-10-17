import { createContext, useContext, useEffect, useState } from "react";
const Ctx = createContext();
export const useCart = () => useContext(Ctx);
// Cart lives in localStorage (survives refresh). Prices shown here are display-only; the server re-prices at checkout.
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mf_cart")) || [];
    } catch {
      return [];
    }
  });
  useEffect(
    () => localStorage.setItem("mf_cart", JSON.stringify(items)),
    [items],
  );
  const add = (p, size, qty) =>
    setItems((cur) => {
      const i = cur.find((x) => x.productId === p._id && x.size === size);
      const max = p.sizes.find((s) => s.size === size)?.stock ?? 0;
      if (i)
        return cur.map((x) =>
          x === i ? { ...x, qty: Math.min(x.qty + qty, max), max } : x,
        );
      return [
        ...cur,
        {
          productId: p._id,
          slug: p.slug,
          name: p.name,
          image: p.images[0]?.url,
          price: p.price,
          mrp: p.mrp,
          size,
          qty: Math.min(qty, max),
          max,
        },
      ];
    });
  const setQty = (id, size, qty) =>
    setItems((c) =>
      c.map((x) =>
        x.productId === id && x.size === size
          ? { ...x, qty: Math.max(1, Math.min(qty, x.max || 10)) }
          : x,
      ),
    );
  const remove = (id, size) =>
    setItems((c) => c.filter((x) => !(x.productId === id && x.size === size)));
  const clear = () => setItems([]);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  return (
    <Ctx.Provider
      value={{ items, add, setQty, remove, clear, count, subtotal }}
    >
      {children}
    </Ctx.Provider>
  );
}
