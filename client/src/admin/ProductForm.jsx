
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errMsg } from "../services/api.js";
import { getSwatchColor, PRODUCT_COLORS } from "../utils/productColors.js";

const empty = {
  name: "",
  description: "",
  category: "",
  gender: "unisex",
  sku: "",
  mrp: "",
  price: "",
  sizesText: "S:10, M:10, L:10, XL:10",
  colors: [],
  tags: "",
  featured: false,
  newArrival: false,
  bestSeller: false,
  onSale: false,
  hangerCollection: false,
  status: "draft",
  images: [],
};

const parseSizes = (t) =>
  t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [size, stock] = x.split(":");
      return {
        size: size.trim().toUpperCase(),
        stock: parseInt(stock, 10),
      };
    });

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const fileRef = useRef();
  const colorPickerRef = useRef();

  const [f, setF] = useState(empty);
  const [cats, setCats] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState([]);
  const [colorSearch, setColorSearch] = useState("");
  const [showColorMenu, setShowColorMenu] = useState(false);

  useEffect(() => {
    api
      .get("/admin/categories")
      .then((r) => setCats(r.data.filter((c) => c.active)))
      .catch((e) => toast.error(errMsg(e)));

    if (id) {
      api
        .get("/admin/products")
        .then((r) => {
          const p = r.data.find((x) => x._id === id);

          if (p) {
            const product = { ...p };

            setF({
              ...empty,
              ...product,
              category: p.category._id,
              mrp: p.mrp,
              price: p.price,
              sizesText: p.sizes
                .map((s) => `${s.size}:${s.stock}`)
                .join(", "),
              colors: (p.colors || []).map((savedColor) =>
                PRODUCT_COLORS.find((color) => color.toLowerCase() === savedColor.toLowerCase()) || savedColor,
              ),
              tags: p.tags.join(", "),
            });
          }
        })
        .catch((e) => toast.error(errMsg(e)));
    }
  }, [id]);

  useEffect(() => {
    const closeColorMenu = (event) => {
      if (!colorPickerRef.current?.contains(event.target)) setShowColorMenu(false);
    };
    document.addEventListener("mousedown", closeColorMenu);
    return () => document.removeEventListener("mousedown", closeColorMenu);
  }, []);

  const set = (k) => (e) =>
    setF({
      ...f,
      [k]:
        e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value,
    });

  const upload = async (files) => {
    const ok = [...files].filter(
      (x) =>
        ["image/jpeg", "image/png", "image/webp"].includes(x.type) &&
        x.size <= 5 * 1024 * 1024,
    );

    if (ok.length !== files.length) {
      toast.error(
        "Some files were skipped. Use JPG, PNG or WEBP up to 5 MB.",
      );
    }

    if (!ok.length) return;

    const fd = new FormData();
    ok.forEach((x) => fd.append("images", x));

    setUploading(1);
    setFailed([]);

    try {
      const { data } = await api.post("/admin/uploads", fd, {
        onUploadProgress: (e) =>
          setUploading(
            Math.round((e.loaded / (e.total || 1)) * 100) || 1,
          ),
      });

      setF((cur) => ({
        ...cur,
        images: [...cur.images, ...data],
      }));

      toast.success("Photos uploaded");
    } catch (e) {
      toast.error(errMsg(e));
      setFailed(ok);
    } finally {
      setUploading(0);
    }
  };

  const move = (i, d) =>
    setF((c) => {
      const a = [...c.images];
      const j = i + d;

      if (j < 0 || j >= a.length) return c;

      [a[i], a[j]] = [a[j], a[i]];

      return { ...c, images: a };
    });

  const dropImg = (i) =>
    setF((c) => ({
      ...c,
      images: c.images.filter((_, k) => k !== i),
    }));

  const save = async (e) => {
    e.preventDefault();

    const mrp = +f.mrp;
    const price = +f.price;
    const sizes = parseSizes(f.sizesText);

    if (f.onSale && (mrp <= 0 || ((mrp - price) / mrp) * 100 <= 15)) {
      return toast.error("On-sale products need a discount greater than 15%. Increase the discount or turn off On sale.");
    }

    if (price > mrp) {
      return toast.error("Selling price cannot be higher than MRP");
    }

    if (
      sizes.some(
        (s) => !s.size || Number.isNaN(s.stock) || s.stock < 0,
      )
    ) {
      return toast.error("Sizes format: S:10, M:5");
    }

    const body = {
      name: f.name,
      description: f.description,
      category: f.category,
      gender: f.gender,
      sku: f.sku,
      images: f.images.map(({ url, publicId }) => ({
        url,
        publicId,
      })),
      mrp,
      price,
      sizes,
      colors: f.colors,
      tags: f.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      featured: f.featured,
      newArrival: f.newArrival,
      bestSeller: f.bestSeller,
      onSale: f.onSale,
      hangerCollection: f.hangerCollection,
      status: f.status,
    };

    setBusy(true);

    try {
      if (id) {
        await api.patch("/admin/products/" + id, body);
      } else {
        await api.post("/admin/products", body);
      }

      toast.success("Product saved");
      nav("/admin/products");
    } catch (er) {
      toast.error(errMsg(er));
      setBusy(false);
    }
  };

  const disc =
    +f.mrp > 0 && +f.price > 0 && +f.price <= +f.mrp
      ? Math.round(((f.mrp - f.price) / f.mrp) * 100)
      : 0;
  const actualDiscount = +f.mrp > 0 ? ((+f.mrp - +f.price) / +f.mrp) * 100 : 0;
  const availableColors = [...PRODUCT_COLORS, ...f.colors.filter((color) => !PRODUCT_COLORS.includes(color))];
  const filteredColors = availableColors.filter((color) => color.toLowerCase().includes(colorSearch.trim().toLowerCase()));
  const toggleColor = (color) => setF((current) => ({
    ...current,
    colors: current.colors.includes(color)
      ? current.colors.filter((item) => item !== color)
      : [...current.colors, color],
  }));

  return (
    <form onSubmit={save} className="max-w-2xl space-y-4">
      <h1 className="font-display text-2xl">
        {id ? "Edit product" : "Add product"}
      </h1>

      <div>
        <label className="lbl" htmlFor="pn">
          Name
        </label>
        <input
          id="pn"
          required
          className="inp"
          value={f.name}
          onChange={set("name")}
        />
      </div>

      <div>
        <label className="lbl" htmlFor="pd">
          Description
        </label>
        <textarea
          id="pd"
          rows={4}
          className="inp"
          value={f.description}
          onChange={set("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl" htmlFor="pc">
            Category
          </label>
          <select
            id="pc"
            required
            className="inp"
            value={f.category}
            onChange={set("category")}
          >
            <option value="">Select…</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="lbl" htmlFor="pg">
            For
          </label>
          <select
            id="pg"
            required
            className="inp"
            value={f.gender}
            onChange={set("gender")}
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>

        <div>
          <label className="lbl" htmlFor="ps">
            SKU
          </label>
          <input
            id="ps"
            required
            className="inp"
            value={f.sku}
            onChange={set("sku")}
          />
        </div>

        <div>
          <label className="lbl" htmlFor="pst">
            Status
          </label>
          <select
            id="pst"
            className="inp"
            value={f.status}
            onChange={set("status")}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="lbl" htmlFor="pm">
            MRP (₹)
          </label>
          <input
            id="pm"
            required
            type="number"
            min="1"
            className="inp"
            value={f.mrp}
            onChange={set("mrp")}
          />
        </div>

        <div>
          <label className="lbl" htmlFor="pp">
            Selling price (₹)
          </label>
          <input
            id="pp"
            required
            type="number"
            min="1"
            className="inp"
            value={f.price}
            onChange={set("price")}
          />
        </div>
      </div>

      <p className="text-sm">
        Displayed discount: <b>{disc}% OFF</b>
      </p>

      <div>
        <label className="lbl" htmlFor="pz">
          Sizes and stock (e.g. S:10, M:5, L:0)
        </label>
        <input
          id="pz"
          required
          className="inp"
          value={f.sizesText}
          onChange={set("sizesText")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl" htmlFor="pco">Colors</label>
          <div ref={colorPickerRef} className="relative">
            <input
              id="pco"
              className="inp"
              value={colorSearch}
              placeholder="Search and select colours"
              autoComplete="off"
              onFocus={() => setShowColorMenu(true)}
              onChange={(event) => { setColorSearch(event.target.value); setShowColorMenu(true); }}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              aria-haspopup="listbox"
              aria-expanded={showColorMenu}
            />
            {f.colors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.colors.map((color) => (
                  <span key={color} className="inline-flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs">
                    <span className="size-3 rounded-full border border-black/15" style={{ background: getSwatchColor(color) }} />
                    {color}
                    <button type="button" className="ml-1 text-neutral-500 hover:text-red-600" aria-label={`Remove ${color}`} onClick={() => toggleColor(color)}>×</button>
                  </span>
                ))}
              </div>
            )}
            {showColorMenu && (
              <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-neutral-300 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900" role="listbox" aria-multiselectable="true" aria-label="Available colours">
                {filteredColors.length ? filteredColors.map((color) => {
                  const selected = f.colors.includes(color);
                  return (
                    <button key={color} type="button" role="option" aria-selected={selected} onClick={() => toggleColor(color)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <span className="size-4 rounded-full border border-black/15" style={{ background: getSwatchColor(color) }} />
                      <span>{color}</span>
                      {selected && <span className="ml-auto text-xs">Selected</span>}
                    </button>
                  );
                }) : <p className="px-2 py-3 text-xs text-neutral-500">No matching colours.</p>}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="lbl" htmlFor="pt">
            Tags (comma separated)
          </label>
          <input
            id="pt"
            className="inp"
            value={f.tags}
            onChange={set("tags")}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={f.featured}
            onChange={set("featured")}
          />
          Featured
        </label>

        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={f.newArrival}
            onChange={set("newArrival")}
          />
          New arrival
        </label>

        <label className="flex gap-2">
          <input type="checkbox" checked={f.bestSeller} onChange={set("bestSeller")} />
          Best seller
        </label>

        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={f.onSale}
            onChange={(event) => {
              if (event.target.checked && actualDiscount <= 15) {
                toast.error("On-sale products need a discount greater than 15%.");
                return;
              }
              setF((current) => ({ ...current, onSale: event.target.checked }));
            }}
          />
          On sale (&gt;15% off)
        </label>

        <label className="flex gap-2">
          <input type="checkbox" checked={f.hangerCollection} onChange={set("hangerCollection")} />
          Hanger collection
        </label>
      </div>

      <div>
        <div className="lbl">Photos</div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          className="btn-o"
          onClick={() => fileRef.current.click()}
          disabled={!!uploading}
        >
          {uploading ? `Uploading… ${uploading}%` : "Upload photos"}
        </button>

        {failed.length > 0 && (
          <button
            type="button"
            className="underline text-sm ml-3"
            onClick={() => upload(failed)}
          >
            Retry failed upload
          </button>
        )}

        <div className="flex flex-wrap gap-3 mt-3">
          {f.images.map((im, i) => (
            <div key={im.url} className="w-24 text-xs">
              <div className="aspect-[3/4] bg-neutral-100 relative">
                <img
                  src={im.url}
                  alt=""
                  className="w-full h-full object-cover"
                />

                {i === 0 && (
                  <span className="absolute top-0 left-0 bg-black text-white px-1">
                    Main
                  </span>
                )}
              </div>

              <div className="flex justify-between mt-1">
                <button
                  type="button"
                  aria-label="Move left"
                  onClick={() => move(i, -1)}
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={() => dropImg(i)}
                >
                  Remove
                </button>

                <button
                  type="button"
                  aria-label="Move right"
                  onClick={() => move(i, 1)}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn" disabled={busy || !!uploading}>
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}


// men and women
// import { useEffect, useRef, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import toast from "react-hot-toast";
// import api, { errMsg } from "../services/api.js";

// const empty = {
//   name: "",
//   description: "",
//   category: "",
//   gender: "unisex",
//   sku: "",
//   mrp: "",
//   price: "",
//   sizesText: "S:10, M:10, L:10, XL:10",
//   colors: "",
//   tags: "",
//   featured: false,
//   newArrival: false,
//   status: "draft",
//   images: [],
// };
// const parseSizes = (t) =>
//   t
//     .split(",")
//     .map((x) => x.trim())
//     .filter(Boolean)
//     .map((x) => {
//       const [size, stock] = x.split(":");
//       return { size: size.trim().toUpperCase(), stock: parseInt(stock, 10) };
//     });

// export default function ProductForm() {
//   const { id } = useParams();
//   const nav = useNavigate();
//   const fileRef = useRef();
//   const [f, setF] = useState(empty);
//   const [cats, setCats] = useState([]);
//   const [uploading, setUploading] = useState(0);
//   const [busy, setBusy] = useState(false);
//   const [failed, setFailed] = useState([]);
//   useEffect(() => {
//     api
//       .get("/admin/categories")
//       .then((r) => setCats(r.data.filter((c) => c.active)));
//     if (id)
//       api.get("/admin/products").then((r) => {
//         const p = r.data.find((x) => x._id === id);
//         if (p)
//           setF({
//             ...p,
//             category: p.category._id,
//             mrp: p.mrp,
//             price: p.price,
//             sizesText: p.sizes.map((s) => `${s.size}:${s.stock}`).join(", "),
//             colors: p.colors.join(", "),
//             tags: p.tags.join(", "),
//           });
//       });
//   }, [id]);
//   const set = (k) => (e) =>
//     setF({
//       ...f,
//       [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
//     });

//   const upload = async (files) => {
//     const ok = [...files].filter(
//       (x) =>
//         ["image/jpeg", "image/png", "image/webp"].includes(x.type) &&
//         x.size <= 5 * 1024 * 1024,
//     );
//     if (ok.length !== files.length)
//       toast.error("Some files were skipped. Use JPG, PNG or WEBP up to 5 MB.");
//     if (!ok.length) return;
//     const fd = new FormData();
//     ok.forEach((x) => fd.append("images", x));
//     setUploading(1);
//     setFailed([]);
//     try {
//       const { data } = await api.post("/admin/uploads", fd, {
//         onUploadProgress: (e) =>
//           setUploading(Math.round((e.loaded / (e.total || 1)) * 100) || 1),
//       });
//       setF((cur) => ({ ...cur, images: [...cur.images, ...data] }));
//       toast.success("Photos uploaded");
//     } catch (e) {
//       toast.error(errMsg(e));
//       setFailed(ok);
//     } finally {
//       setUploading(0);
//     }
//   };
//   const move = (i, d) =>
//     setF((c) => {
//       const a = [...c.images];
//       const j = i + d;
//       if (j < 0 || j >= a.length) return c;
//       [a[i], a[j]] = [a[j], a[i]];
//       return { ...c, images: a };
//     });
//   const dropImg = (i) =>
//     setF((c) => ({ ...c, images: c.images.filter((_, k) => k !== i) })); // the server deletes the old Cloudinary asset on save

//   const save = async (e) => {
//     e.preventDefault();
//     const mrp = +f.mrp,
//       price = +f.price;
//     const sizes = parseSizes(f.sizesText);
//     if (price > mrp)
//       return toast.error("Selling price cannot be higher than MRP");
//     if (sizes.some((s) => !s.size || Number.isNaN(s.stock) || s.stock < 0))
//       return toast.error("Sizes format: S:10, M:5");
//     const body = {
//       name: f.name,
//       description: f.description,
//       category: f.category,
//       gender: f.gender,
//       sku: f.sku,
//       images: f.images.map(({ url, publicId }) => ({ url, publicId })),
//       mrp,
//       price,
//       sizes,
//       colors: f.colors
//         .split(",")
//         .map((x) => x.trim())
//         .filter(Boolean),
//       tags: f.tags
//         .split(",")
//         .map((x) => x.trim())
//         .filter(Boolean),
//       featured: f.featured,
//       newArrival: f.newArrival,
//       status: f.status,
//     };
//     setBusy(true);
//     try {
//       id
//         ? await api.patch("/admin/products/" + id, body)
//         : await api.post("/admin/products", body);
//       toast.success("Product saved");
//       nav("/admin/products");
//     } catch (er) {
//       toast.error(errMsg(er));
//       setBusy(false);
//     }
//   };
//   const disc =
//     +f.mrp > 0 && +f.price > 0 && +f.price <= +f.mrp
//       ? Math.round(((f.mrp - f.price) / f.mrp) * 100)
//       : 0;
//   return (
//     <form onSubmit={save} className="max-w-2xl space-y-4">
//       <h1 className="font-display text-2xl">
//         {id ? "Edit product" : "Add product"}
//       </h1>
//       <div>
//         <label className="lbl" htmlFor="pn">
//           Name
//         </label>
//         <input
//           id="pn"
//           required
//           className="inp"
//           value={f.name}
//           onChange={set("name")}
//         />
//       </div>
//       <div>
//         <label className="lbl" htmlFor="pd">
//           Description
//         </label>
//         <textarea
//           id="pd"
//           rows={4}
//           className="inp"
//           value={f.description}
//           onChange={set("description")}
//         />
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div>
//           <label className="lbl" htmlFor="pc">
//             Category
//           </label>
//           <select
//             id="pc"
//             required
//             className="inp"
//             value={f.category}
//             onChange={set("category")}
//           >
//             <option value="">Select…</option>
//             {cats.map((c) => (
//               <option key={c._id} value={c._id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="lbl" htmlFor="pg">
//             For
//           </label>
//           <select
//             id="pg"
//             className="inp"
//             value={f.gender}
//             onChange={set("gender")}
//           >
//             <option value="men">Men</option>
//             <option value="women">Women</option>
//             <option value="unisex">Unisex</option>
//           </select>
//         </div>
//         <div>
//           <label className="lbl" htmlFor="ps">
//             SKU
//           </label>
//           <input
//             id="ps"
//             required
//             className="inp"
//             value={f.sku}
//             onChange={set("sku")}
//           />
//         </div>
//         <div>
//           <label className="lbl" htmlFor="pst">
//             Status
//           </label>
//           <select
//             id="pst"
//             className="inp"
//             value={f.status}
//             onChange={set("status")}
//           >
//             <option value="draft">Draft</option>
//             <option value="published">Published</option>
//             <option value="archived">Archived</option>
//           </select>
//         </div>
//         <div>
//           <label className="lbl" htmlFor="pm">
//             MRP (₹)
//           </label>
//           <input
//             id="pm"
//             required
//             type="number"
//             min="1"
//             className="inp"
//             value={f.mrp}
//             onChange={set("mrp")}
//           />
//         </div>
//         <div>
//           <label className="lbl" htmlFor="pp">
//             Selling price (₹)
//           </label>
//           <input
//             id="pp"
//             required
//             type="number"
//             min="1"
//             className="inp"
//             value={f.price}
//             onChange={set("price")}
//           />
//         </div>
//       </div>
//       <p className="text-sm">
//         Displayed discount: <b>{disc}% OFF</b>
//       </p>
//       <div>
//         <label className="lbl" htmlFor="pz">
//           Sizes and stock (e.g. S:10, M:5, L:0)
//         </label>
//         <input
//           id="pz"
//           required
//           className="inp"
//           value={f.sizesText}
//           onChange={set("sizesText")}
//         />
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div>
//           <label className="lbl" htmlFor="pco">
//             Colors (comma separated)
//           </label>
//           <input
//             id="pco"
//             className="inp"
//             value={f.colors}
//             onChange={set("colors")}
//           />
//         </div>
//         <div>
//           <label className="lbl" htmlFor="pt">
//             Tags (comma separated)
//           </label>
//           <input
//             id="pt"
//             className="inp"
//             value={f.tags}
//             onChange={set("tags")}
//           />
//         </div>
//       </div>
//       <div className="flex gap-6 text-sm">
//         <label className="flex gap-2">
//           <input
//             type="checkbox"
//             checked={f.featured}
//             onChange={set("featured")}
//           />{" "}
//           Featured
//         </label>
//         <label className="flex gap-2">
//           <input
//             type="checkbox"
//             checked={f.newArrival}
//             onChange={set("newArrival")}
//           />{" "}
//           New arrival
//         </label>
//       </div>
//       <div>
//         <div className="lbl">Photos</div>
//         <input
//           ref={fileRef}
//           type="file"
//           accept="image/jpeg,image/png,image/webp"
//           multiple
//           hidden
//           onChange={(e) => {
//             upload(e.target.files);
//             e.target.value = "";
//           }}
//         />
//         <button
//           type="button"
//           className="btn-o"
//           onClick={() => fileRef.current.click()}
//           disabled={!!uploading}
//         >
//           {uploading ? `Uploading… ${uploading}%` : "Upload photos"}
//         </button>
//         {failed.length > 0 && (
//           <button
//             type="button"
//             className="underline text-sm ml-3"
//             onClick={() => upload(failed)}
//           >
//             Retry failed upload
//           </button>
//         )}
//         <div className="flex flex-wrap gap-3 mt-3">
//           {f.images.map((im, i) => (
//             <div key={im.url} className="w-24 text-xs">
//               <div className="aspect-[3/4] bg-neutral-100 relative">
//                 <img
//                   src={im.url}
//                   alt=""
//                   className="w-full h-full object-cover"
//                 />
//                 {i === 0 && (
//                   <span className="absolute top-0 left-0 bg-black text-white px-1">
//                     Main
//                   </span>
//                 )}
//               </div>
//               <div className="flex justify-between mt-1">
//                 <button
//                   type="button"
//                   aria-label="Move left"
//                   onClick={() => move(i, -1)}
//                 >
//                   ←
//                 </button>
//                 <button type="button" onClick={() => dropImg(i)}>
//                   Remove
//                 </button>
//                 <button
//                   type="button"
//                   aria-label="Move right"
//                   onClick={() => move(i, 1)}
//                 >
//                   →
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//       <button className="btn" disabled={busy || !!uploading}>
//         {busy ? "Saving…" : "Save product"}
//       </button>
//     </form>
//   );
// }
