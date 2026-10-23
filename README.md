# MonoFit

**Everyday fashion. Better prices.**

MonoFit is a full-stack fashion storefront for clean basics and wardrobe staples for men and women. Customers can browse and search a product catalog, manage a cart and wishlist, check out, and follow their orders. Store admins manage products, inventory, orders, categories, and product photos from a protected admin panel.

<p align="center">
  <strong>React · Vite · Express · MongoDB · Cloudinary</strong>
</p>

---

## What’s inside

- Responsive storefront with product categories, featured products, new arrivals, sale items, and search.
- Product pages with sizes, stock, colors, and product imagery.
- Customer accounts, saved addresses, and wishlists.
- Cart, checkout, coupon pricing, and Cash on Delivery.
- Optional online payments through Razorpay.
- Order history, status updates, and public order tracking.
- Protected admin dashboard for products, categories, orders, and customers.
- Cloudinary product image uploads, with image URLs and asset IDs stored alongside product data.
- Light and dark themes.

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens and bcrypt |
| Product images | Cloudinary |
| Payments | Razorpay (optional) |

## Project layout

```text
monofit/
├── client/                 # React storefront and admin interface
│   ├── src/pages/           # Storefront pages
│   ├── src/admin/            # Admin panel and product editor
│   └── src/services/         # API client
├── server/                 # Express API
│   ├── config/               # Cloudinary configuration
│   ├── middleware/           # Authentication and authorization
│   ├── models/               # Mongoose models
│   ├── routes/               # API routes
│   ├── scripts/              # Database seed and admin bootstrap
│   └── services/             # Order and pricing logic
└── vercel.json             # Vercel client/API routing configuration
```

## Run locally

### Requirements

- Node.js 18 or later and npm
- A MongoDB database (local or hosted)
- A Cloudinary account for product photo uploads
- Razorpay credentials only if you want online payments

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the backend

Create `server/.env` (or copy `server/.env.example`) and set the required values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/monofit
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Cloudinary credentials are available in the Cloudinary Console. Keep the API secret on the server; do not put it in frontend variables or commit it to Git.

Online payments are optional. To enable them, also set:

```env
PAYMENT_GATEWAY_KEY_ID=your-razorpay-key-id
PAYMENT_GATEWAY_KEY_SECRET=your-razorpay-key-secret
PAYMENT_WEBHOOK_SECRET=your-razorpay-webhook-secret
```

Without Razorpay credentials, Cash on Delivery remains available and online checkout is disabled.

### 3. Start the API and storefront

Open two terminals from the repository root:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Open the Vite URL shown in the client terminal (usually `http://localhost:5173`). The Vite development server forwards `/api` requests to the local Express server on port `5000` by default. Set `API_PROXY_TARGET` if your API runs elsewhere.

### 4. Optional: add sample catalog data

```bash
cd server
npm run seed
```

This creates sample categories and products. Sample products do not include photos; upload product images through the admin panel.

### 5. Create an admin account

Set these values in `server/.env`:

```env
ADMIN_NAME=Store Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-unique-password-of-8-or-more-characters
```

Then run once:

```bash
cd server
npm run create-admin
```

The script creates an admin account, or promotes an existing user with the configured email. Sign in at `/admin/login`. There is no public admin registration route.

## Upload product photos

1. Configure all three Cloudinary environment variables on the backend and restart/redeploy it.
2. Sign in as an admin and open **Admin Panel → Products**.
3. Create or edit a product and use **Upload photos**.
4. Save the product and set its status to **Published** for it to appear in the storefront.

Uploads accept JPG, PNG, or WEBP images up to 5 MB each, with up to 8 images per upload request. The backend streams them to the `monofit/products` Cloudinary folder. Product records retain each image’s secure URL and Cloudinary `publicId`, which allows managed cleanup when images or products are removed.

## Deploy

The repository includes a `vercel.json` configured with separate `client` and `server` services and routes `/api/*` requests to the Express service. Configure the deployment according to your hosting provider’s monorepo/service setup.

Set backend environment variables in the environment where the Express API runs:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL` (the deployed frontend origin; comma-separated origins are supported)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Razorpay variables if online payments are enabled
- `PORT` if required by the host

If the frontend and backend are deployed on separate origins, set `VITE_API_BASE_URL` for the client build to the API base URL, such as `https://api.example.com/api`. Never expose server secrets through `VITE_` variables. After changing deployment environment variables, redeploy or restart the backend.

## Useful commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run build` | Build the frontend for production |
| `client` | `npm run preview` | Preview the production build locally |
| `server` | `npm run dev` | Start the API with Node watch mode |
| `server` | `npm start` | Start the API |
| `server` | `npm run seed` | Add sample categories and products |
| `server` | `npm run create-admin` | Create or promote the configured admin account |
| `server` | `npm test` | Run the server test suite |

## Security notes

- Keep `.env` files and credentials out of version control. The repository `.gitignore` excludes environment files.
- Use a long, unique `JWT_SECRET` and a strong, private admin password.
- Keep Cloudinary and Razorpay secrets on the backend only.
- Admin APIs require an authenticated account with the `admin` role.
- Password reset email delivery is not configured yet; the current forgot/reset endpoints are placeholders.

## License

See [LICENSE](LICENSE).
