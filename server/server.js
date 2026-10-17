import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import auth from "./routes/auth.js";
import catalog from "./routes/catalog.js";
import orders from "./routes/orders.js";
import admin from "./routes/admin.js";
import payments, { webhook } from "./routes/payments.js";
import { errorHandler, notFound } from "./middleware/auth.js";

for (const k of ["MONGODB_URI", "JWT_SECRET"])
  if (!process.env[k]) {
    console.error(`Missing env var ${k}`);
    process.exit(1);
  }
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "").split(","),
    credentials: true,
  }),
);
app.use(morgan("tiny"));
app.post("/api/payments/webhook", express.raw({ type: "*/*" }), webhook);
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api", catalog);
app.use("/api/orders", orders);
app.use("/api/payments", payments);
app.use("/api/admin", admin);
app.use(notFound);
app.use(errorHandler);

await mongoose.connect(process.env.MONGODB_URI);
app.listen(process.env.PORT || 5000, () =>
  console.log("MonoFit API running on port " + (process.env.PORT || 5000)),
);
