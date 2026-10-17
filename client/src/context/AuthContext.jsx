import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(!!localStorage.getItem('mf_token'));
  useEffect(() => {
    if (!localStorage.getItem('mf_token')) return;
    api.get('/auth/me').then((r) => { setUser(r.data.user); setWishlist(r.data.wishlist.map(String)); })
      .catch(() => localStorage.removeItem('mf_token')).finally(() => setLoading(false));
  }, []);
  const login = (d) => { localStorage.setItem('mf_token', d.token); setUser(d.user); api.get('/auth/me').then((r) => setWishlist(r.data.wishlist.map(String))); };
  const logout = () => { localStorage.removeItem('mf_token'); setUser(null); setWishlist([]); };
  const toggleWish = async (id) => { const r = await api.post('/auth/wishlist/' + id); setWishlist(r.data.wishlist.map(String)); };
  return <Ctx.Provider value={{ user, loading, login, logout, wishlist, toggleWish }}>{children}</Ctx.Provider>;
}
