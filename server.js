import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";

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

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// These can stay for things like payment proofs or legacy files,
// but product images / avatars should now use Cloudinary.
const uploadsDir = path.join(__dirname, "uploads");
const paymentProofsDir = path.join(__dirname, "uploads", "payment-proofs");
const avatarsDir = path.join(__dirname, "uploads", "avatars");
const heroDir = path.join(__dirname, "uploads", "hero");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(paymentProofsDir)) {
  fs.mkdirSync(paymentProofsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(heroDir)) {
  fs.mkdirSync(heroDir, { recursive: true });
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8081",
  "https://saint-clothing-frontend.vercel.app",
  "https://saint-clothing-admin.vercel.app",
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests like Postman, server-to-server, curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "token"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

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

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log("SERVER START ERROR:", error.message);
    process.exit(1);
  }
};

startServer();