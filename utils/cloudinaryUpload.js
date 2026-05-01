import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/* ==============================
   NORMAL UPLOAD (SAFE)
   ============================== */
const uploadBufferToCloudinary = (fileBuffer, folder = "saint-clothing") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Normal Upload Error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

/* ==============================
   PRODUCT IMAGE (REMOVE BG)
   ============================== */
export const uploadProductImageToCloudinary = (
  fileBuffer,
  folder = "saint-clothing/products"
) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",

        // 🔥 REMOVE BACKGROUND
        background_removal: "cloudinary_ai",

        // 🔥 FORCE TRANSPARENT PNG
        format: "png",

        // 🔥 AUTO OPTIMIZATION
        quality: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Product Upload Error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

export default uploadBufferToCloudinary;