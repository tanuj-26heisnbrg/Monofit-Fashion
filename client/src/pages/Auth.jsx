import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errMsg } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Auth({ mode }) {
  const reg = mode === "register";
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(
        reg ? "/auth/register" : "/auth/login",
        f,
      );
      login(data);
      toast.success(reg ? "Account created" : "Welcome back");
      nav(sp.get("next") || "/");
    } catch (er) {
      toast.error(errMsg(er));
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto px-4 py-20 space-y-4">
      <h1 className="font-display text-3xl">
        {reg ? "Create account" : "Log in"}
      </h1>
      {reg && (
        <div>
          <label className="lbl" htmlFor="n">
            Name
          </label>
          <input
            id="n"
            required
            className="inp"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
      )}
      <div>
        <label className="lbl" htmlFor="e">
          Email
        </label>
        <input
          id="e"
          type="email"
          required
          className="inp"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
      </div>
      <div>
        <label className="lbl" htmlFor="p">
          Password
        </label>
        <input
          id="p"
          type="password"
          required
          minLength={8}
          className="inp"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
        />
      </div>
      <button className="btn w-full" disabled={busy}>
        {busy ? "Please wait…" : reg ? "Create account" : "Log in"}
      </button>
      <p className="text-sm text-center">
        {reg ? (
          <>
            Have an account?{" "}
            <Link className="underline" to="/login">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link className="underline" to="/register">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
