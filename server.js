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

// use your current PC LAN IP here
const localIP = "192.168.254.101";

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

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  })
);

app.options("*", cors());

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
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, "0.0.0.0", () => {
      console.log("Server running on:");
      console.log(`- Local:   http://localhost:${port}`);
      console.log(`- Network: http://${localIP}:${port}`);
    });
  } catch (error) {
    console.log("SERVER START ERROR:", error.message);
    process.exit(1);
  }
};

startServer();