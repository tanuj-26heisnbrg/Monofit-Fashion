import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg, inr } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const statusLabel = (s) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function Account() {
  const { user, loading, logout, wishlist } = useAuth(); const nav = useNavigate(); const [sp] = useSearchParams();
  const [orders, setOrders] = useState(null); const [wl, setWl] = useState([]);
  const load = () => api.get('/orders/my-orders').then((r) => setOrders(r.data));
  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => { if (user && wishlist.length) api.get('/products?limit=48').then((r) => setWl(r.data.items.filter((p) => wishlist.includes(p._id)))); else setWl([]); }, [wishlist, user]);
  if (loading) return null;
  if (!user) return <Navigate to="/login?next=/account" />;
  const cancel = async (id) => { if (!confirm('Cancel this order?')) return; try { await api.post(`/orders/${id}/cancel`); toast.success('Order cancelled'); load(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center"><div><h1 className="font-display text-3xl">Hi, {user.name}</h1><p className="text-sm text-neutral-600">{user.email}</p></div><div className="flex gap-2">{user.role === 'admin' && <Link to="/admin" className="btn-o">Admin</Link>}<button className="btn" onClick={() => { logout(); nav('/'); }}>Log out</button></div></div>
      {sp.get('tab') === 'wishlist' && <section className="mt-10"><h2 className="font-display text-xl mb-4">Wishlist</h2>{wl.length ? <ul className="space-y-2 text-sm">{wl.map((p) => <li key={p._id}><Link className="underline" to={'/product/' + p.slug}>{p.name}</Link> · {inr(p.price)}</li>)}</ul> : <p className="text-sm text-neutral-500">No saved items yet.</p>}</section>}
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
