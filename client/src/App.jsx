import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Auth from './pages/Auth.jsx';
import { Account, OrderDetail } from './pages/Account.jsx';
import Policy from './pages/Policy.jsx';
import Contact from './pages/Contact.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import Admin from './admin/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="account" element={<Account />} />
        <Route path="contact" element={<Contact />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="order-success/:id" element={<OrderDetail success />} />
        <Route path="p/:slug" element={<Policy />} />
        <Route path="admin/*" element={<Admin />} />
        <Route path="*" element={<div className="py-24 text-center"><h1 className="font-display text-3xl">Page not found</h1><Link to="/" className="btn mt-4">Back to home</Link></div>} />
      </Route>
    </Routes>
  );
}
