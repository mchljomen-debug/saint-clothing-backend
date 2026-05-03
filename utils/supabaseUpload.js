import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export const uploadModelToSupabase = async (file) => {
  if (!file?.buffer) return "";

  const ext = file.originalname.split(".").pop()?.toLowerCase() || "glb";
  const fileName = `model-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from("models")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype || "model/gltf-binary",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("models").getPublicUrl(filePath);

  return data.publicUrl;
};