import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import heroRouter from "./routes/heroRoute.js";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import adminRouter from "./routes/adminRoute.js";
import branchRouter from "./routes/branchRoute.js";
import activityRoute from "./routes/activityRoute.js";
import orderRouter from "./routes/orderRoute.js";
import addressRouter from "./routes/addressRoute.js";
import recommendationRouter from "./routes/recommendationRoute.js";
import policyRouter from "./routes/policyRoute.js";
import categoryRouter from "./routes/categoryRoute.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   LOCAL FILE DIRECTORIES
================================ */
const uploadsDir = path.join(__dirname, "uploads");
const paymentProofsDir = path.join(__dirname, "uploads", "payment-proofs");
const avatarsDir = path.join(__dirname, "uploads", "avatars");
const heroDir = path.join(__dirname, "uploads", "hero");

[uploadsDir, paymentProofsDir, avatarsDir, heroDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* ===============================
   CORS CONFIG (UPDATED)
================================ */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8081",
  "https://saint-clothing-frontend.vercel.app",
  "https://saint-clothing-admin.vercel.app",
  "https://saintclothingbrandph.com",
  "https://www.saintclothingbrandph.com",
    "saintclothingbrandph.com",
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));

/* ===============================
   TEST ROUTES
================================ */
app.get("/", (req, res) => {
  res.send("API Working");
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend reachable",
  });
});

app.get("/api/address-check", (req, res) => {
  res.json({
    success: true,
    message: "address route server file is active",
  });
});

app.get("/api/uploads-check", (req, res) => {
  res.json({
    success: true,
    uploadsPath: uploadsDir,
    paymentProofsPath: paymentProofsDir,
    avatarsPath: avatarsDir,
    heroPath: heroDir,
  });
});

/* ===============================
   ROUTES
================================ */
app.use("/api/hero", heroRouter);
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/admin", adminRouter);
app.use("/api/branch", branchRouter);
app.use("/api/activity", activityRoute);
app.use("/api/order", orderRouter);
app.use("/api/address", addressRouter);
app.use("/api/recommendation", recommendationRouter);
app.use("/api/policy", policyRouter);
app.use("/api/category", categoryRouter);

/* ===============================
   404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.log("SERVER ERROR:", err);

  if (err.message && err.message.startsWith("CORS blocked for origin:")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ===============================
   START SERVER
================================ */
const startServer = async () => {
  try {
    await connectDB();
    await connectCloudinary();

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log("SERVER START ERROR:", error.message);
    process.exit(1);
  }
};

startServer();