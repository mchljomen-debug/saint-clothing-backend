import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/* NORMAL UPLOAD - use for size chart, 3D model, banners, etc. */
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Normal Upload Error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/* PRODUCT IMAGE ONLY - auto background removal */
export const uploadProductImageToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        background_removal: "cloudinary_ai",
        format: "png",
        quality: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Product Image Upload Error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export default uploadBufferToCloudinary;