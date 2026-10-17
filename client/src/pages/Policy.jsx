import { useParams } from 'react-router-dom';
// Draft policy copy: the store owner must review and replace it to match real operations and applicable law before launch.
const P = {
  shipping: ['Shipping Policy', 'Orders ship within 2–4 business days. Shipping is ₹49, free on orders above ₹999.'],
  returns: ['Return and Exchange Policy', 'Returns and exchanges are accepted within 7 days of delivery for unused items with tags.'],
  refunds: ['Refund Policy', 'Refunds go to the original payment method after the returned item is inspected. COD refunds are handled manually.'],
  privacy: ['Privacy Policy', 'We store only the information needed to process your orders and never sell personal data.'],
  terms: ['Terms and Conditions', 'By ordering from MonoFit you agree to these terms. Prices and availability can change without notice.'],
  faq: ['Frequently Asked Questions', 'How long does delivery take? Usually 3–7 business days. Can I cancel? Yes, before the order is packed, from My orders.'],
  about: ['About MonoFit', 'MonoFit sells affordable, everyday clothing for men and women from our own inventory.'],
  contact: ['Contact Us', 'Email support@monofit.example. We reply within one business day.'],
};
export default function Policy() {
  const { slug } = useParams(); const [t, b] = P[slug] || ['Not found', 'This page does not exist.'];
  return <div className="max-w-2xl mx-auto px-4 py-16"><h1 className="font-display text-3xl mb-4">{t}</h1><p className="text-neutral-700 leading-relaxed">{b}</p><p className="mt-6 text-xs text-neutral-500">Draft text. The store owner must review before launch.</p></div>;
}
