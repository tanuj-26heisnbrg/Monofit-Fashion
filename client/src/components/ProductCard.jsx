import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { inr } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export const Skeleton = ({ n = 4 }) => <>{Array.from({ length: n }).map((_, i) => <div key={i} className="animate-pulse"><div className="aspect-[3/4] bg-neutral-200" /><div className="h-3 bg-neutral-200 mt-3 w-3/4" /><div className="h-3 bg-neutral-200 mt-2 w-1/3" /></div>)}</>;

export default function ProductCard({ p }) {
  const { user, wishlist, toggleWish } = useAuth();
  const out = (p.totalStock ?? p.sizes.reduce((a, s) => a + s.stock, 0)) === 0;
  const liked = wishlist.includes(p._id);
  const wish = (e) => { e.preventDefault(); if (!user) return toast('Log in to save items'); toggleWish(p._id); };
  return (
    <Link to={'/product/' + p.slug} className="group block">
      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
        {p.images[0] ? <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full grid place-items-center text-neutral-400 text-xs">No photo</div>}
        {p.discountPct > 0 && <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1">{p.discountPct}% OFF</span>}
        {out && <span className="absolute inset-x-0 bottom-0 bg-white/90 text-center text-xs py-2">Out of stock</span>}
        <button onClick={wish} aria-label="Wishlist" className="absolute top-2 right-2 bg-white p-1.5"><Heart size={16} fill={liked ? '#000' : 'none'} /></button>
      </div>
      <div className="mt-3 text-sm">{p.name}</div>
      <div className="text-sm mt-1"><span className="font-medium">{inr(p.price)}</span>{p.mrp > p.price && <span className="text-neutral-500 line-through ml-2">{inr(p.mrp)}</span>}</div>
    </Link>
  );
}
