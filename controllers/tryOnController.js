import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const tryOnJobs = new Map();

const uploadBufferToCloudinary = (fileBuffer, folder = "saint-clothing/try-on") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

const normalizeResultImage = (payload) => {
  const results = payload?.data?.results;

  if (Array.isArray(results) && results.length > 0) {
    return (
      results[0]?.url ||
      results[0]?.file_url ||
      results[0]?.result_url ||
      results[0]?.image_url ||
      ""
    );
  }

  return (
    payload?.data?.result_url ||
    payload?.data?.resultImage ||
    payload?.data?.result_image ||
    payload?.data?.url ||
    ""
  );
};

export const startPerfectTryOn = async (req, res) => {
  try {
    const { garmentImageUrl, category } = req.body;

    if (!process.env.PERFECT_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "PERFECT_API_KEY is missing in backend .env",
      });
    }

    if (!process.env.PERFECT_START_URL) {
      return res.status(500).json({
        success: false,
        message: "PERFECT_START_URL is missing in backend .env",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Person image is required",
      });
    }

    if (!garmentImageUrl) {
      return res.status(400).json({
        success: false,
        message: "Garment image URL is required",
      });
    }

    const uploadedPerson = await uploadBufferToCloudinary(req.file.buffer);

    const payload = {
      src_file_url: uploadedPerson.secure_url,
      ref_file_url: garmentImageUrl,
      garment_category: category || "auto",
    };

    const response = await axios.post(process.env.PERFECT_START_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERFECT_API_KEY}`,
      },
      timeout: 60000,
    });

    const taskId = response.data?.data?.task_id;

    if (!taskId) {
      return res.status(500).json({
        success: false,
        message: "Perfect API did not return task_id",
        raw: response.data,
      });
    }

    tryOnJobs.set(taskId, {
      status: "processing",
      resultImage: "",
      personImage: uploadedPerson.secure_url,
      garmentImage: garmentImageUrl,
      raw: response.data,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      taskId,
      message: "Try-on started",
    });
  } catch (error) {
    console.error("Perfect Try-On Start Error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to start Perfect try-on",
      error: error.response?.data || error.message,
    });
  }
};

export const getPerfectTryOnStatus = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!process.env.PERFECT_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "PERFECT_API_KEY is missing in backend .env",
      });
    }

    if (!process.env.PERFECT_STATUS_URL) {
      return res.status(500).json({
        success: false,
        message: "PERFECT_STATUS_URL is missing in backend .env",
      });
    }

    const localJob = tryOnJobs.get(taskId);

    if (localJob?.status === "success" && localJob?.resultImage) {
      return res.json({
        success: true,
        status: "success",
        resultImage: localJob.resultImage,
      });
    }

    const statusUrl = `${process.env.PERFECT_STATUS_URL}/${encodeURIComponent(taskId)}`;

    const response = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERFECT_API_KEY}`,
      },
      timeout: 30000,
    });

    const taskStatus = response.data?.data?.task_status || "processing";
    const resultImage = normalizeResultImage(response.data);

    if (taskStatus === "success" || resultImage) {
      tryOnJobs.set(taskId, {
        ...(localJob || {}),
        status: "success",
        resultImage,
        raw: response.data,
        updatedAt: new Date(),
      });
    }

    if (taskStatus === "error") {
      tryOnJobs.set(taskId, {
        ...(localJob || {}),
        status: "error",
        raw: response.data,
        updatedAt: new Date(),
      });
    }

    res.json({
      success: true,
      status: taskStatus,
      resultImage,
      raw: response.data,
    });
  } catch (error) {
    console.error("Perfect Try-On Status Error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get try-on status",
      error: error.response?.data || error.message,
    });
  }
};

export const perfectWebhook = async (req, res) => {
  try {
    const body = req.body;

    const taskId = body?.data?.task_id || body?.task_id;
    const taskStatus = body?.data?.task_status || body?.task_status || "processing";
    const resultImage = normalizeResultImage(body);

    if (taskId) {
      tryOnJobs.set(taskId, {
        status: taskStatus,
        resultImage,
        raw: body,
        updatedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Webhook received",
    });
  } catch (error) {
    console.error("Perfect Webhook Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Webhook failed",
    });
  }
};