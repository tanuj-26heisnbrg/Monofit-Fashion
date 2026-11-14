import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, Search, X } from "lucide-react";
import api, { inr } from "../services/api.js";

const RECENT_KEY = "mf_recent_searches";

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch {
    return [];
  }
}

export default function SearchBox({ className = "", onSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const id = useId();
  const root = useRef(null);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], categories: [] });
  const [recent, setRecent] = useState(readRecent);
  const [active, setActive] = useState(-1);
  const queryParam = new URLSearchParams(location.search).get("q") || "";

  useEffect(() => setQuery(queryParam), [queryParam, location.pathname]);

  useEffect(() => {
    const value = query.trim();
    setActive(-1);
    if (value.length < 2) {
      setResults({ products: [], categories: [] });
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api.get("/products/suggest", { params: { q: value } })
        .then(({ data }) => { if (!cancelled) setResults(data); })
        .catch(() => { if (!cancelled) setResults({ products: [], categories: [] }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const options = [
    ...results.categories.map((category) => ({ type: "category", value: category })),
    ...results.products.map((product) => ({ type: "product", value: product })),
  ];

  const remember = (value) => {
    const next = [value, ...recent.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* Search still works when storage is unavailable. */ }
  };

  const search = (value = query) => {
    const clean = value.trim();
    setOpen(false);
    setActive(-1);
    onSearch?.();
    if (!clean) return;
    remember(clean);
    navigate(`/shop?q=${encodeURIComponent(clean)}`);
  };

  const choose = (item) => {
    setOpen(false);
    onSearch?.();
    if (item.type === "category") {
      remember(item.value.name);
      navigate(`/shop?category=${encodeURIComponent(item.value.slug)}`);
    } else {
      remember(query.trim());
      navigate(`/product/${item.value.slug}`);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => options.length ? (index + 1) % options.length : -1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => options.length ? (index <= 0 ? options.length - 1 : index - 1) : -1);
    }
    if (event.key === "Enter" && open && active >= 0 && options[active]) {
      event.preventDefault();
      choose(options[active]);
    }
  };

  const showRecent = open && query.trim().length < 2 && recent.length > 0;
  const showSuggestions = open && query.trim().length >= 2;

  return (
    <div ref={root} className={`searchbox relative ${className}`}>
      <form onSubmit={(event) => { event.preventDefault(); search(); }} className="flex w-full items-center gap-2">
        <input
          role="combobox"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={showRecent || showSuggestions}
          aria-controls={`${id}-suggestions`}
          aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search clothing"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
        />
        {query && <button type="button" aria-label="Clear search" className="text-neutral-500 hover:text-black dark:hover:text-white" onClick={() => { setQuery(""); setOpen(true); }}><X size={15} /></button>}
        <button type="submit" aria-label="Search" className="shrink-0"><Search size={17} /></button>
      </form>

      {(showRecent || showSuggestions) && (
        <div id={`${id}-suggestions`} role="listbox" className="searchbox-menu">
          {showRecent && <>
            <div className="searchbox-heading">Recent searches</div>
            {recent.map((item) => <button key={item} type="button" className="searchbox-recent" onClick={() => { setQuery(item); search(item); }}><Clock3 size={14} /><span>{item}</span><Search size={13} className="ml-auto" /></button>)}
          </>}
          {showSuggestions && <>
            {loading && <div className="searchbox-status">Searching products…</div>}
            {!loading && !options.length && <div className="searchbox-status">No quick matches. Press Enter to see all results.</div>}
            {!loading && results.categories.length > 0 && <div className="searchbox-heading">Categories</div>}
            {!loading && options.map((item, index) => item.type === "category" ? (
              <button id={`${id}-option-${index}`} key={`category-${item.value._id}`} role="option" aria-selected={active === index} type="button" className={`searchbox-category ${active === index ? "is-active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
                <Search size={14} /><span>{item.value.name}</span><span className="ml-auto text-xs text-neutral-500">Category</span>
              </button>
            ) : (
              <button id={`${id}-option-${index}`} key={`product-${item.value._id}`} role="option" aria-selected={active === index} type="button" className={`searchbox-product ${active === index ? "is-active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
                {item.value.images?.[0]?.url ? <img src={item.value.images[0].url} alt="" /> : <span className="searchbox-no-image" />}
                <span className="min-w-0 flex-1"><span className="block truncate">{item.value.name}</span><span className="mt-1 block text-xs text-neutral-500">{item.value.category?.name || "Clothing"}</span></span>
                <span className="shrink-0 text-sm">{inr(item.value.price)}</span>
              </button>
            ))}
            {!loading && options.length > 0 && <button type="button" className="searchbox-all" onClick={() => search()}>See all results for “{query.trim()}”</button>}
          </>}
        </div>
      )}
    </div>
  );
}
