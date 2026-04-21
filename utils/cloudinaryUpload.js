import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const uploadBufferToCloudinary = (fileBuffer, folder = "saint-clothing") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

export default uploadBufferToCloudinary;