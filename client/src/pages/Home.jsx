import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import ProductCard, { Skeleton } from "../components/ProductCard.jsx";

const Row = ({ title, items, to, loading }) => (
  <section className="max-w-7xl mx-auto px-4 mt-16">
    <div className="flex items-end justify-between mb-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {to && (
        <Link to={to} className="text-sm underline underline-offset-4">
          View all
        </Link>
      )}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {loading ? (
        <Skeleton />
      ) : items.length ? (
        items.slice(0, 4).map((p) => <ProductCard key={p._id} p={p} />)
      ) : (
        <p className="col-span-full text-sm text-neutral-500">
          Nothing here yet. Products appear when the admin publishes them.
        </p>
      )}
    </div>
  </section>
);

export default function Home() {
  const [d, setD] = useState(null);
  const [cats, setCats] = useState([]);
  useEffect(() => {
    api
      .get("/products/featured")
      .then((r) => setD(r.data))
      .catch(() =>
        setD({ featured: [], newArrivals: [], bestSellers: [], sale: [] }),
      );
    api
      .get("/categories")
      .then((r) => setCats(r.data))
      .catch(() => {});
  }, []);
  const l = !d;
  return (
    <>
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32">
          <h1 className="font-display text-5xl md:text-8xl leading-[0.95] max-w-3xl">
            Everyday fashion. Better prices.
          </h1>
          <p className="mt-6 max-w-md text-neutral-300">
            Clean basics and wardrobe staples for men and women, priced for
            every day.
          </p>   
          {/* men and  women  */}
          {/* <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex bg-white text-black px-6 py-3 text-sm font-medium hover:bg-neutral-200"
            >
              Shop now
            </Link>
            <Link
              to="/shop?gender=men"
              className="inline-flex border border-white px-6 py-3 text-sm hover:bg-white hover:text-black"
            >
              Men
            </Link>
            <Link
              to="/shop?gender=women"
              className="inline-flex border border-white px-6 py-3 text-sm hover:bg-white hover:text-black"
            >
              Women
            </Link>
          </div> */}
          
       <div className="mt-8 flex flex-wrap gap-3">
       <Link
        to="/shop"
         className="inline-flex bg-white text-black px-6 py-3 text-sm font-medium hover:bg-neutral-200"
       >
        Shop now
       </Link>  
       </div>

        </div>
      </section>
      {cats.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link
              key={c._id}
              to={"/shop?category=" + c.slug}
              className="border border-neutral-300 px-4 py-2 text-sm hover:bg-black hover:text-white"
            >
              {c.name}
            </Link>
          ))}
        </section>
      )}
      <Row
        title="New arrivals"
        items={d?.newArrivals || []}
        to="/shop?new=1"
        loading={l}
      />
      <Row
        title="Best sellers"
        items={d?.bestSellers || []}
        to="/shop?sort=best"
        loading={l}
      />
      <Row title="Featured" items={d?.featured || []} to="/shop" loading={l} />
      <Row
        title="On sale"
        items={d?.sale || []}
        to="/shop?minDiscount=20"
        loading={l}
      />
    </>
  );
}
