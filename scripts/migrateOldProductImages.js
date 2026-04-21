import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import Product from "../models/productModel.js";

const rootDir = process.cwd();
const uploadsDir = path.join(rootDir, "uploads");

const isCloudinaryUrl = (value = "") =>
  typeof value === "string" &&
  (value.startsWith("https://res.cloudinary.com/") ||
    value.startsWith("http://res.cloudinary.com/"));

const isRemoteUrl = (value = "") =>
  typeof value === "string" &&
  (value.startsWith("https://") || value.startsWith("http://"));

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

const resolveOldFilePath = (filename) => {
  const clean = String(filename || "").replace(/^\/+/, "").trim();
  if (!clean) return null;

  const candidates = [
    path.join(uploadsDir, clean),
    path.join(uploadsDir, path.basename(clean)),
    path.join(uploadsDir, "avatars", path.basename(clean)),
    path.join(uploadsDir, "hero", path.basename(clean)),
    path.join(uploadsDir, "payment-proofs", path.basename(clean)),
  ];

  return candidates.find(fileExists) || null;
};

const uploadLocalFileToCloudinary = async (filePath, folder) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto",
  });
  return result.secure_url;
};

const migrateArrayField = async (items, folder, productName) => {
  if (!Array.isArray(items) || items.length === 0) return { changed: false, value: items };

  let changed = false;
  const next = [];

  for (const item of items) {
    const current = String(item || "").trim();

    if (!current) continue;

    if (isCloudinaryUrl(current) || isRemoteUrl(current)) {
      next.push(current);
      continue;
    }

    const oldPath = resolveOldFilePath(current);

    if (!oldPath) {
      console.log(`[SKIP] Missing file for ${productName}: ${current}`);
      next.push(current);
      continue;
    }

    try {
      const url = await uploadLocalFileToCloudinary(oldPath, folder);
      next.push(url);
      changed = true;
      console.log(`[OK] Migrated ${productName}: ${current} -> ${url}`);
    } catch (error) {
      console.log(`[ERROR] Upload failed for ${productName}: ${current} -> ${error.message}`);
      next.push(current);
    }
  }

  return { changed, value: next };
};

const migrateSingleField = async (value, folder, productName, label) => {
  const current = String(value || "").trim();
  if (!current) return { changed: false, value: current };

  if (isCloudinaryUrl(current) || isRemoteUrl(current)) {
    return { changed: false, value: current };
  }

  const oldPath = resolveOldFilePath(current);

  if (!oldPath) {
    console.log(`[SKIP] Missing ${label} for ${productName}: ${current}`);
    return { changed: false, value: current };
  }

  try {
    const url = await uploadLocalFileToCloudinary(oldPath, folder);
    console.log(`[OK] Migrated ${label} for ${productName}`);
    return { changed: true, value: url };
  } catch (error) {
    console.log(`[ERROR] Failed ${label} for ${productName}: ${error.message}`);
    return { changed: false, value: current };
  }
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  if (
    !process.env.CLOUDINARY_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_SECRET_KEY
  ) {
    throw new Error("Cloudinary environment variables are missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });

  const products = await Product.find({});
  console.log(`Found ${products.length} products`);

  let updatedCount = 0;

  for (const product of products) {
    let changed = false;
    const productName = `${product.name || "Unnamed Product"}${product.sku ? ` (${product.sku})` : ""}`;

    const migratedImages = await migrateArrayField(
      product.images,
      "saint-clothing/products",
      productName
    );
    if (migratedImages.changed) {
      product.images = migratedImages.value;
      changed = true;
    }

    const migratedSizeChart = await migrateSingleField(
      product.sizeChartImage,
      "saint-clothing/size-charts",
      productName,
      "sizeChartImage"
    );
    if (migratedSizeChart.changed) {
      product.sizeChartImage = migratedSizeChart.value;
      changed = true;
    }

    const migratedModel = await migrateSingleField(
      product.model3d,
      "saint-clothing/models",
      productName,
      "model3d"
    );
    if (migratedModel.changed) {
      product.model3d = migratedModel.value;
      changed = true;
    }

    if (changed) {
      if (!product.image && Array.isArray(product.images) && product.images[0]) {
        product.image = product.images[0];
      }

      await product.save();
      updatedCount++;
      console.log(`[SAVED] ${productName}`);
    }
  }

  console.log(`Done. Updated products: ${updatedCount}`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Migration failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});