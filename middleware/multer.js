import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 35 * 1024 * 1024, // 50MB
  },
});

export default upload;