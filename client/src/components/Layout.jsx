
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Heart, Menu, Moon, ShieldCheck, ShoppingBag, Sun, User, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import SearchBox from "./SearchBox.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const links = [
    ["/", "Home"],
    ["/shop", "Shop All"],
    ["/shop?new=1", "New Arrivals"],
    ["/shop?onSale=1", "Sale"],
    ["/track-order", "Track your order"],
    ["/contact", "Contact"],
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
          <button
            className="lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <Link to="/" className="font-display text-2xl tracking-tight">
            MonoFit
          </Link>

          <nav className="hidden lg:flex gap-6 text-sm">
            {links.map(([to, l]) => (
              <Link
                key={l}
                to={to}
                className="hover:underline underline-offset-4"
              >
                {l}
              </Link>
            ))}
          </nav>

          <SearchBox className="hidden md:block ml-auto border border-neutral-300 dark:border-neutral-700 px-3 w-64" />

          <div className="flex items-center gap-4 ml-auto md:ml-0">
            {user?.role === "admin" && (
              <Link to="/admin" className="btn-o !px-2 sm:!px-3 !py-2 text-xs whitespace-nowrap" aria-label="Open admin panel">
                <ShieldCheck size={15} className="sm:hidden" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
            )}
            <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} className="p-1">
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link to={user ? "/account" : "/login"} aria-label="Account" title="Profile">
              <User size={20} />
            </Link>

            <Link to="/account?tab=wishlist" aria-label="Wishlist" title="Wishlist">
              <Heart size={20} />
            </Link>

            <Link to="/cart" aria-label="Cart" title="Cart" className="relative">
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 rounded-full grid place-items-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-white dark:bg-neutral-950">
            <SearchBox className="border border-neutral-300 dark:border-neutral-700 px-3" onSearch={() => setOpen(false)} />

            {links.map(([to, l]) => (
              <Link
                key={l}
                to={to}
                onClick={() => setOpen(false)}
                className="block py-1"
              >
                {l}
              </Link>
            ))}

            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block py-1"
              >
                Admin
              </Link>
            )}

            {user && (
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="block py-1"
              >
                Log out
              </button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-black text-white mt-20 dark:!bg-[#171815]">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <div className="font-display text-xl">MonoFit</div>
            <p className="mt-2 text-neutral-400">
              Everyday Fashion. Better Prices.
            </p>
          </div>

          <div>
            <div className="font-medium mb-2">Shop</div>
            {[
              ["Shop All", "/shop"],
              ["Sale", "/shop?onSale=1"],
            ].map(([l, t]) => (
              <Link
                key={l}
                to={t}
                className="block text-neutral-400 hover:text-white py-0.5"
              >
                {l}
              </Link>
            ))}
          </div>

          <div>
            <div className="font-medium mb-2">Help</div>
            {[
              "about",
              "shipping",
              "returns",
              "refunds",
              "privacy",
              "terms",
              "faq",
            ].map((p) => (
              <Link
                key={p}
                to={"/p/" + p}
                className="block text-neutral-400 hover:text-white py-0.5 capitalize"
              >
                {p}
              </Link>
            ))}
          </div>

          <div>
            <div className="font-medium mb-2">Contact</div>
            <Link
              to="/contact"
              className="block text-neutral-400 hover:text-white py-0.5"
            >
              Contact us
            </Link>
            <a
              href="mailto:support@monofit.example"
              className="text-neutral-400 hover:text-white"
            >
              support@monofit.example
            </a>

            {user?.role === "admin" && (
              <Link to="/admin" className="block mt-3 underline">
                Admin panel
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
