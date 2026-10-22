import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import api, { errMsg, inr } from "../services/api.js";
import ProductForm from "./ProductForm.jsx";
import { statusLabel } from "../pages/Account.jsx";

function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  if (error) return <p role="alert" className="text-red-700">Could not load dashboard: {error}</p>;
  if (!d) return <p>Loading…</p>;
  const stats = [
    ["Products", d.products],
    ["Orders", d.orders],
    ["Pending", d.pending],
    ["Delivered", d.delivered],
    ["Sales", inr(d.sales)],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(([l, v]) => (
          <div key={l} className="border border-neutral-200 p-4">
            <div className="text-xs text-neutral-500">{l}</div>
            <div className="text-2xl font-display">{v}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500 mt-2">
        Sales = paid online orders + delivered COD orders. Cancelled and
        returned orders are excluded.
      </p>
      <div className="mt-6 flex gap-2">
        <Link className="btn" to="/admin/products/new">
          Add product
        </Link>
        <Link className="btn-o" to="/admin/orders">
          Manage orders
        </Link>
      </div>
      <h2 className="font-medium mt-8 mb-2">
        Low stock (5 or fewer in a size)
      </h2>
      {d.lowStock.length ? (
        <ul className="text-sm space-y-1">
          {d.lowStock.map((p) => (
            <li key={p._id}>
              <Link className="underline" to={"/admin/products/" + p._id}>
                {p.name}
              </Link>{" "}
              ·{" "}
              {p.sizes
                .filter((s) => s.stock <= 5)
                .map((s) => `${s.size}:${s.stock}`)
                .join(", ")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">Nothing low.</p>
      )}
      <h2 className="font-medium mt-8 mb-2">Recent orders</h2>
      {d.recent.length ? (
        <ul className="text-sm space-y-1">
          {d.recent.map((o) => (
            <li key={o._id}>
              <Link className="underline" to={"/admin/orders/" + o._id}>
                {o.orderNumber}
              </Link>{" "}
              · {o.address?.name} · {inr(o.pricing.total)} ·{" "}
              {statusLabel(o.status)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No orders yet.</p>
      )}
    </div>
  );
}

function Products() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/admin/products").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const del = async (p) => {
    if (!confirm(`Delete or archive "${p.name}"?`)) return;
    try {
      const r = await api.delete("/admin/products/" + p._id);
      toast.success(r.data.message || "Deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="font-display text-2xl">Products</h1>
        <Link className="btn" to="/admin/products/new">
          Add product
        </Link>
      </div>
      {!items ? (
        <p>Loading…</p>
      ) : !items.length ? (
        <p className="text-neutral-500">No products yet. Add your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-t border-neutral-200">
                  <td className="py-2 flex items-center gap-2">
                    <div className="w-8 h-10 bg-neutral-100">
                      {p.images[0] && (
                        <img
                          src={p.images[0].url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {p.name}
                  </td>
                  <td>
                    {inr(p.price)}{" "}
                    <span className="text-neutral-400 line-through">
                      {inr(p.mrp)}
                    </span>
                  </td>
                  <td>{p.totalStock}</td>
                  <td>{p.status}</td>
                  <td className="text-right">
                    <Link
                      className="underline mr-3"
                      to={"/admin/products/" + p._id}
                    >
                      Edit
                    </Link>
                    <button className="underline" onClick={() => del(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const STATUS_FLOW = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
];
function Orders() {
  const [d, setD] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const load = () =>
    api
      .get("/admin/orders", {
        params: { status: status || undefined, q: q || undefined },
      })
      .then((r) => setD(r.data));
  useEffect(() => {
    load();
  }, [status]); // eslint-disable-line
  return (
    <div>
      <h1 className="font-display text-2xl mb-4">Orders</h1>
      <div className="flex gap-2 mb-4">
        <select
          aria-label="Status"
          className="inp max-w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <input
          aria-label="Order number"
          className="inp max-w-60"
          placeholder="Order number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-o" onClick={load}>
          Search
        </button>
      </div>
      {!d ? (
        <p>Loading…</p>
      ) : !d.items.length ? (
        <p className="text-neutral-500">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((o) => (
                <tr key={o._id} className="border-t border-neutral-200">
                  <td className="py-2">
                    <Link className="underline" to={"/admin/orders/" + o._id}>
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{o.address.name}</td>
                  <td>{inr(o.pricing.total)}</td>
                  <td>
                    {o.payment.method} · {o.payment.status}
                  </td>
                  <td>{statusLabel(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderAdmin() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [t, setT] = useState({ courier: "", trackingId: "", url: "" });
  const load = () => api.get("/admin/orders/" + id).then((r) => setO(r.data));
  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line
  const patch = async (body) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, body);
      toast.success("Order updated");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  if (!o) return <p>Loading…</p>;
  return (
    <div className="text-sm space-y-3 max-w-2xl">
      <h1 className="font-display text-2xl">{o.orderNumber}</h1>
      <p>
        {o.user?.name} · {o.user?.email} · {o.address.phone}
      </p>
      <p>
        {o.address.line1}, {o.address.city}, {o.address.state}{" "}
        {o.address.pincode}
      </p>
      <div className="border-y border-neutral-200 divide-y divide-neutral-200">
        {o.items.map((i, k) => (
          <div key={k} className="py-2 flex justify-between">
            <span>
              {i.name} ({i.size}) × {i.qty}
            </span>
            <span>{inr(i.price * i.qty)}</span>
          </div>
        ))}
      </div>
      <p className="font-medium">
        Total {inr(o.pricing.total)} · {o.payment.method} · payment{" "}
        {o.payment.status}
      </p>
      <div className="flex gap-2 items-center">
        <label className="lbl m-0" htmlFor="st">
          Status
        </label>
        <select
          id="st"
          className="inp max-w-56"
          value={o.status}
          onChange={(e) =>
            confirm("Change status to " + statusLabel(e.target.value) + "?") &&
            patch({ status: e.target.value })
          }
        >
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>
      {o.payment.status === "refund_pending" && (
        <button
          className="btn-o"
          onClick={() =>
            confirm("Confirm the refund has actually been paid?") &&
            patch({ paymentStatus: "refunded" })
          }
        >
          Mark refund as paid
        </button>
      )}
      <div className="grid grid-cols-3 gap-2">
        <input
          aria-label="Courier"
          className="inp"
          placeholder="Courier"
          value={t.courier}
          onChange={(e) => setT({ ...t, courier: e.target.value })}
        />
        <input
          aria-label="Tracking ID"
          className="inp"
          placeholder="Tracking ID"
          value={t.trackingId}
          onChange={(e) => setT({ ...t, trackingId: e.target.value })}
        />
        <input
          aria-label="Tracking URL"
          className="inp"
          placeholder="Tracking URL"
          value={t.url}
          onChange={(e) => setT({ ...t, url: e.target.value })}
        />
      </div>
      <button
        className="btn-o"
        onClick={() =>
          patch({
            tracking: {
              courier: t.courier,
              trackingId: t.trackingId,
              url: t.url || undefined,
            },
          })
        }
      >
        Save tracking
      </button>
      <ul className="pt-3">
        {o.history.map((h, k) => (
          <li key={k}>
            {new Date(h.at).toLocaleString()}: {statusLabel(h.status)}{" "}
            {h.note && `(${h.note})`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Categories() {
  const [c, setC] = useState([]);
  const [n, setN] = useState("");
  const load = () => api.get("/admin/categories").then((r) => setC(r.data));
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/categories", { name: n, order: c.length });
      setN("");
      load();
    } catch (er) {
      toast.error(errMsg(er));
    }
  };
  const upd = async (x, body) => {
    await api.patch("/admin/categories/" + x._id, body);
    load();
  };



  
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-4">Categories</h1>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          aria-label="Category name"
          className="inp"
          required
          placeholder="New category name"
          value={n}
          onChange={(e) => setN(e.target.value)}
        />
        <button className="btn">Add</button>
      </form>
      {c.map((x, i) => (
        <div
          key={x._id}
          className="flex items-center gap-3 border-t border-neutral-200 py-2 text-sm"
        >
          <span className="flex-1">
            {x.name}
            {!x.active && " (inactive)"}
          </span>
          <button
            className="underline"
            disabled={i === 0}
            onClick={() => upd(x, { order: c[i - 1].order - 1 })}
          >
            Move up
          </button>
          <button
            className="underline"
            onClick={() => upd(x, { active: !x.active })}
          >
            {x.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin")
    return <Navigate to="/admin/login" replace />;
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-[180px_1fr] gap-8">
      <nav className="flex md:flex-col gap-3 text-sm overflow-x-auto text-neutral-700 dark:text-neutral-300">
        {[
          ["/admin", "Dashboard"],
          ["/admin/products", "Products"],
          ["/admin/orders", "Orders"],
          ["/admin/categories", "Categories"],
        ].map(([to, l]) => (
          <NavLink
            key={to}
            end
            to={to}
            className={({ isActive }) =>
              isActive ? "font-semibold underline" : ""
            }
          >
            {l}
          </NavLink>
        ))}
      </nav>
      <div className="text-neutral-900 dark:text-neutral-100">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderAdmin />} />
          <Route path="categories" element={<Categories />} />
        </Routes>
      </div>
    </div>
  );
}
