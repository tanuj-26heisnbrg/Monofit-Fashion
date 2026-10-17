export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
export const orderNumber = () =>
  "MF" +
  Date.now().toString(36).toUpperCase() +
  Math.floor(Math.random() * 900 + 100);
export const FREE_SHIPPING_ABOVE = 999;
export const SHIPPING_FEE = 49;
