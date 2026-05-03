import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/* ==============================
   NORMAL UPLOAD
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
   3D MODEL / RAW FILE UPLOAD
   For GLB, GLTF, USDZ
============================== */
export const uploadRawFileToCloudinary = (
  fileBuffer,
  folder = "saint-clothing/models"
) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Raw Upload Error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

/* ==============================
   PRODUCT IMAGE UPLOAD
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
        transformation: [{ effect: "background_removal" }],
        format: "png",
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