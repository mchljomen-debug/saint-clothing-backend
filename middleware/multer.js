import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",

  ".glb",
  ".gltf",
  ".usdz",

  ".mp4",
  ".webm",
  ".ogg",
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        "Unsupported file type. Allowed: images, GLB, GLTF, USDZ, MP4, WEBM, OGG."
      ),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 35 * 1024 * 1024, // 35MB
  },
});

export default upload;