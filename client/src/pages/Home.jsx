import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import ProductCard, { Skeleton } from "../components/ProductCard.jsx";

function ProductLook({ product, index }) {
  return (
    <Link to={`/product/${product.slug}`} className="look-item" style={{ "--delay": `${index * 55}ms` }} aria-label={`View ${product.name}`}>
      <span className="look-hanger" aria-hidden="true" />
      <span className="look-image-wrap">
        <img src={product.images[0].url} alt={product.name} className="look-photo" loading={index < 5 ? "eager" : "lazy"} />
      </span>
      <span className="look-product-name">{product.name}</span>
    </Link>
  );
}

const Row = ({ title, items, to, loading }) => (
  <section className="max-w-7xl mx-auto px-4 mt-16">
    <div className="flex items-end justify-between mb-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {to && <Link to={to} className="text-sm underline underline-offset-4">View all</Link>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {loading ? <Skeleton /> : items.length ? items.slice(0, 4).map((p) => <ProductCard key={p._id} p={p} />) : (
        <p className="col-span-full text-sm text-neutral-500">Nothing here yet. Products appear when the admin publishes them.</p>
      )}
    </div>
  </section>
);

const popularCategoryGroups = [
  { label: "T-Shirts", slugs: ["t-shirts", "oversized-t-shirts"] },
  { label: "Shirts", slugs: ["shirts"] },
  { label: "Bottoms", slugs: ["jeans-and-trousers", "bottoms"] },
  { label: "Co-Ords", slugs: ["co-ords", "coords"] },
  { label: "New Arrivals", to: "/shop?new=1" },
  { label: "Accessories", slugs: ["accessories"] },
];

export default function Home() {
  const [d, setD] = useState(null);
  const [cats, setCats] = useState([]);
  useEffect(() => {
    api.get("/products/featured").then((r) => setD(r.data)).catch(() => setD({ featured: [], newArrivals: [], bestSellers: [], sale: [], hangerCollection: [] }));
    api.get("/categories").then((r) => setCats(r.data)).catch(() => {});
  }, []);
  const loading = !d;
  const railProducts = (d?.hangerCollection || [])
    .filter((product) => product.images?.[0]?.url)
    .slice(0, 9);
  const categoryProducts = d?.hangerCollection || d?.newArrivals || [];
  return (
    <>
      <section className="collection-hero">
        <div className="collection-copy">
          <p className="collection-kicker">A considered wardrobe · 2025</p>
          <h1>Made for the<br /><em>everyday.</em></h1>
          <p className="collection-description">Thoughtful layers, easy silhouettes, and the colors you’ll reach for again and again.</p>
          <Link to="/shop?hangerCollection=1" className="collection-cta">Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="wardrobe-scene" aria-label="A collection of clothes hanging on a rail">
          <div className="scene-caption"><span>NEW COLLECTION</span><span>THE AUTUMN EDIT — NO. 01</span></div>
          <div className="clothes-rail"><span /><span /></div>
          <div className={`look-row ${railProducts.length < 6 ? "look-row-sparse" : ""}`}>
            {loading ? <p className="rail-message">Curating the collection…</p> : railProducts.length ? railProducts.map((product, index) => <ProductLook key={product._id} product={product} index={index} />) : <p className="rail-message">Product photos will appear here as they’re added to the shop.</p>}
          </div>
          <div className="scene-floor" />
        </div>
        <div className="hero-index"><span>01</span><span className="hero-index-line" /><span>04</span></div>
      </section>
      <section className="popular-categories" aria-labelledby="popular-categories-title">
        <h2 id="popular-categories-title">Popular Categories</h2>
        <div className="popular-category-grid">{popularCategoryGroups.map((group) => {
          const matchedCategories = cats.filter((category) => group.slugs?.includes(category.slug));
          const product = categoryProducts.find((item) => matchedCategories.some((category) => category.slug === item.category?.slug) && item.images?.[0]?.url);
          const to = group.to || (matchedCategories.length ? `/shop?category=${matchedCategories[0].slug}` : "/shop");
          return <Link key={group.label} to={to} className="popular-category">{product ? <img src={product.images[0].url} alt="" loading="lazy" /> : <span className="popular-category-mark" aria-hidden="true">{group.label === "New Arrivals" ? "✦" : group.label.slice(0, 1)}</span>}<span>{group.label}</span></Link>;
        })}</div>
      </section>
      <Row title="New arrivals" items={d?.newArrivals || []} to="/shop?new=1" loading={loading} />
      <Row title="Best sellers" items={d?.bestSellers || []} to="/shop?bestSeller=1" loading={loading} />
      <Row title="Featured" items={d?.featured || []} to="/shop?featured=1" loading={loading} />
      <Row title="On sale" items={d?.sale || []} to="/shop?onSale=1" loading={loading} />
    </>
  );
}
