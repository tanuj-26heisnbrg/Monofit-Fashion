import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errMsg } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { Moon, Sun } from "lucide-react";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.user.role !== "admin") {
        toast.error("This account does not have admin access");
        setBusy(false);
        return;
      }
      login(data);
      toast.success("Welcome to MonoFit Admin");
      nav("/admin", { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <button onClick={toggleTheme} className="absolute top-5 right-5 p-2" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div>
          <Link to="/" className="font-display text-xl">MonoFit</Link>
          <h1 className="font-display text-3xl mt-8">Admin login</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Sign in with your store administrator account.</p>
        </div>
        <div>
          <label className="lbl" htmlFor="admin-email">Email</label>
          <input id="admin-email" className="inp" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="admin-password">Password</label>
          <input id="admin-password" className="inp" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in to admin"}</button>
        <Link to="/" className="block text-center text-sm underline">Back to store</Link>
      </form>
    </main>
  );
}
