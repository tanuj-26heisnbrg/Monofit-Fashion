import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg, inr } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const statusLabel = (s) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const hasStock = (p) => (p.totalStock ?? p.sizes?.reduce((sum, size) => sum + size.stock, 0) ?? 0) > 0;

async function loadWishlistProducts(ids) {
  let products = [];
  try {
    const { data } = await api.get('/auth/wishlist');
    if (Array.isArray(data)) products = data;
  } catch {
    // Older backend instances may not have the dedicated wishlist endpoint yet.
  }

  const byId = new Map(products.map((product) => [String(product._id), product]));
  const missingIds = ids.filter((id) => !byId.has(String(id)));
  if (missingIds.length) {
    const { data: firstPage } = await api.get('/products?limit=48&page=1');
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) =>
        api.get(`/products?limit=48&page=${index + 2}`),
      ),
    );
    const catalog = [
      ...(firstPage.items || []),
      ...remainingPages.flatMap((response) => response.data.items || []),
    ];
    for (const product of catalog) {
      if (missingIds.includes(String(product._id))) {
        byId.set(String(product._id), product);
      }
    }
  }

  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}

export function Account() {

  const { user, loading, logout, wishlist, toggleWish } = useAuth(); const nav = useNavigate(); const [sp] = useSearchParams();

  const [orders, setOrders] = useState(null); const [wl, setWl] = useState([]); const [wishlistLoading, setWishlistLoading] = useState(false); const [wishlistError, setWishlistError] = useState(false);

  const load = () => api.get('/orders/my-orders').then((r) => setOrders(r.data));

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    let active = true;
    if (!user || !wishlist.length) {
      setWl([]);
      setWishlistError(false);
      setWishlistLoading(false);
      return () => { active = false; };
    }

    setWishlistLoading(true);
    setWishlistError(false);
    loadWishlistProducts(wishlist)
      .then((products) => { if (active) setWl(products); })
      .catch(() => { if (active) { setWl([]); setWishlistError(true); } })
      .finally(() => { if (active) setWishlistLoading(false); });
    return () => { active = false; };
  }, [wishlist, user]);
  if (loading) return null;

  if (!user) return <Navigate to="/login?next=/account" />;

  const cancel = async (id) => { if (!confirm('Cancel this order?')) return; try { await api.post(`/orders/${id}/cancel`); toast.success('Order cancelled'); load(); } catch (e) { toast.error(errMsg(e)); } };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center"><div><h1 className="font-display text-3xl">Hi, {user.name}</h1><p className="text-sm text-neutral-600">{user.email}</p></div><div className="flex gap-2">{user.role === 'admin' && <Link to="/admin" className="btn-o">Admin</Link>}<button className="btn" onClick={() => { logout(); nav('/'); }}>Log out</button></div></div>
      {sp.get('tab') === 'wishlist' && <section className="mt-10">
        <h2 className="font-display text-xl mb-4">Wishlist</h2>
        {wishlistLoading ? <p className="text-sm text-neutral-500">Loading saved items…</p> : wishlistError ? <p className="text-sm text-red-600 dark:text-red-400">Could not load your saved items. Please try again.</p> : wl.length ? <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
          {wl.map((p) => <article key={p._id} className="flex gap-4 py-4 sm:gap-6">
            <Link to={'/product/' + p.slug} aria-label={p.name} className="w-24 h-28 sm:w-32 sm:h-36 shrink-0 bg-neutral-100 dark:bg-neutral-800 grid place-items-center overflow-hidden">
              {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-contain p-1" /> : <span className="text-xs text-neutral-500">No photo</span>}
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <Link to={'/product/' + p.slug} className="font-medium hover:underline line-clamp-2">{p.name}</Link>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-medium">{inr(p.price)}</span>
                {p.mrp > p.price && <><span className="text-neutral-500 dark:text-neutral-400 line-through">{inr(p.mrp)}</span><span className="text-xs text-red-600 dark:text-red-400">{p.discountPct}% off</span></>}
              </div>
              <p className={`mt-1 text-xs ${hasStock(p) ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {hasStock(p) ? 'In stock' : 'Out of stock'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link to={'/product/' + p.slug} className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-900 hover:text-white hover:border-neutral-900 dark:hover:bg-white dark:hover:text-black dark:hover:border-white">View product</Link>
                <button type="button" className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-900 hover:text-white hover:border-neutral-900 dark:hover:bg-white dark:hover:text-black dark:hover:border-white" onClick={() => toggleWish(p._id)}>Remove</button>
              </div>
            </div>
          </article>)}
        </div> : <p className="text-sm text-neutral-500">No saved items yet.</p>}
      </section>}
      <section className="mt-10"><h2 className="font-display text-xl mb-4">My orders</h2>
        {!orders ? <p className="text-sm">Loading…</p> : !orders.length ? <p className="text-sm text-neutral-500">No orders yet. <Link className="underline" to="/shop">Start shopping</Link></p> :
          <div className="space-y-3">{orders.map((o) => (
            <div key={o._id} className="border border-neutral-200 p-4 text-sm">
              <div className="flex justify-between"><Link to={'/orders/' + o._id} className="font-medium underline">{o.orderNumber}</Link><span>{statusLabel(o.status)}</span></div>
              <p className="text-neutral-600 mt-1">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item(s) · {inr(o.pricing.total)} · {o.payment.method === 'cod' ? 'COD' : 'Online'} ({o.payment.status})</p>
              {['placed', 'confirmed', 'processing'].includes(o.status) && <button className="underline mt-2" onClick={() => cancel(o._id)}>Cancel order</button>}
            </div>))}</div>}
      </section>
    </div>
  );
}

export function OrderDetail({ success }) {
  const { id } = useParams(); const [o, setO] = useState(null);
  useEffect(() => { api.get('/orders/' + id).then((r) => setO(r.data)).catch(() => setO(false)); }, [id]);
  if (o === false) return <p className="py-20 text-center">Order not found.</p>;
  if (!o) return <p className="py-20 text-center">Loading…</p>;
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-sm">
      {success && <div className="bg-black text-white p-6 mb-8"><h1 className="font-display text-2xl">Thank you. Your order is placed.</h1><p className="mt-1">Order number {o.orderNumber}</p></div>}
      {!success && <h1 className="font-display text-3xl mb-4">{o.orderNumber}</h1>}
      <p className="font-medium">Status: {statusLabel(o.status)} · Payment: {o.payment.method === 'cod' ? 'Cash on delivery' : 'Online'} ({o.payment.status})</p>
      {o.tracking?.trackingId && <p className="mt-1">Courier {o.tracking.courier}: {o.tracking.url ? <a className="underline" href={o.tracking.url} target="_blank" rel="noreferrer">{o.tracking.trackingId}</a> : o.tracking.trackingId}</p>}
      <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">{o.items.map((i, k) => <div key={k} className="flex justify-between py-3"><span>{i.name} ({i.size}) × {i.qty}</span><span>{inr(i.price * i.qty)}</span></div>)}</div>
      <div className="mt-4 ml-auto max-w-xs space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>{inr(o.pricing.subtotal)}</span></div>{o.pricing.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{inr(o.pricing.discount)}</span></div>}<div className="flex justify-between"><span>Shipping</span><span>{inr(o.pricing.shipping)}</span></div><div className="flex justify-between font-medium"><span>Total</span><span>{inr(o.pricing.total)}</span></div></div>
      <p className="mt-6 text-neutral-600">Ship to: {o.address.name}, {o.address.line1}, {o.address.city}, {o.address.state} {o.address.pincode}</p>
      <h2 className="font-medium mt-6 mb-2">Timeline</h2><ul className="space-y-1">{o.history.map((h, k) => <li key={k}>{new Date(h.at).toLocaleString()}: {statusLabel(h.status)}{h.note ? ` (${h.note})` : ''}</li>)}</ul>
      <Link to="/account" className="underline block mt-8">All orders</Link>
    </div>
  );
}
