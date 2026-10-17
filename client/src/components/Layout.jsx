import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth(); const { count } = useCart(); const nav = useNavigate();
  const [open, setOpen] = useState(false); const [q, setQ] = useState('');
  const links = [['/', 'Home'], ['/shop?gender=men', 'Men'], ['/shop?gender=women', 'Women'], ['/shop', 'Shop All'], ['/shop?new=1', 'New Arrivals'], ['/shop?minDiscount=30', 'Sale']];
  const go = (e) => { e.preventDefault(); if (q.trim()) nav('/shop?q=' + encodeURIComponent(q.trim())); setOpen(false); };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
          <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <Link to="/" className="font-display text-2xl tracking-tight">MonoFit</Link>
          <nav className="hidden lg:flex gap-6 text-sm">{links.map(([to, l]) => <Link key={l} to={to} className="hover:underline underline-offset-4">{l}</Link>)}</nav>
          <form onSubmit={go} className="hidden md:flex ml-auto items-center border border-neutral-300 px-3 w-64">
            <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clothing" className="flex-1 py-2 text-sm outline-none" />
            <button aria-label="Search"><Search size={16} /></button>
          </form>
          <div className="flex items-center gap-4 ml-auto md:ml-0">
            <Link to={user ? '/account' : '/login'} aria-label="Account"><User size={20} /></Link>
            <Link to="/account?tab=wishlist" aria-label="Wishlist"><Heart size={20} /></Link>
            <Link to="/cart" aria-label="Cart" className="relative"><ShoppingBag size={20} />{count > 0 && <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 rounded-full grid place-items-center">{count}</span>}</Link>
          </div>
        </div>
        {open && <div className="lg:hidden border-t border-neutral-200 p-4 space-y-3 bg-white">
          <form onSubmit={go} className="flex border border-neutral-300 px-3"><input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 py-2 text-sm outline-none" /><button aria-label="Search"><Search size={16} /></button></form>
          {links.map(([to, l]) => <Link key={l} to={to} onClick={() => setOpen(false)} className="block py-1">{l}</Link>)}
          {user?.role === 'admin' && <Link to="/admin" onClick={() => setOpen(false)} className="block py-1">Admin</Link>}
          {user && <button onClick={() => { logout(); setOpen(false); }} className="block py-1">Log out</button>}
        </div>}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-black text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-4 text-sm">
          <div><div className="font-display text-xl">MonoFit</div><p className="mt-2 text-neutral-400">Everyday Fashion. Better Prices.</p></div>
          <div><div className="font-medium mb-2">Shop</div>{[['Men', '/shop?gender=men'], ['Women', '/shop?gender=women'], ['Sale', '/shop?minDiscount=30']].map(([l, t]) => <Link key={l} to={t} className="block text-neutral-400 hover:text-white py-0.5">{l}</Link>)}</div>
          <div><div className="font-medium mb-2">Help</div>{['about', 'contact', 'shipping', 'returns', 'refunds', 'privacy', 'terms', 'faq'].map((p) => <Link key={p} to={'/p/' + p} className="block text-neutral-400 hover:text-white py-0.5 capitalize">{p}</Link>)}</div>
          <div><div className="font-medium mb-2">Contact</div><p className="text-neutral-400">support@monofit.example<br />Mon–Sat, 10am–6pm</p>{user?.role === 'admin' && <Link to="/admin" className="block mt-3 underline">Admin panel</Link>}</div>
        </div>
      </footer>
    </div>
  );
}
