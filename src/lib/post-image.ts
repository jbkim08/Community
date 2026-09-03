import { supabase } from "@/lib/supabase";

export const POST_IMAGE_BUCKET = "post-images";
export const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validatePostImage(file: File) {
  const extension = getFileExtension(file.name);

  if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.type)) {
    return "jpg, jpeg, png, webp 형식의 이미지만 업로드할 수 있습니다.";
  }

  if (file.size > MAX_POST_IMAGE_SIZE) {
    return "이미지 파일은 5MB 이하만 업로드할 수 있습니다.";
  }

  return null;
}

export async function uploadPostImage(userId: string, file: File) {
  const extension = getFileExtension(file.name);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });

  if (error) {
    return { path: null, error };
  }

  return { path, error: null };
}

export async function removePostImage(path: string) {
  const { error } = await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]);
  return error;
}
