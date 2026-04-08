import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Use /media so URLs don't conflict with app/uploads/ route (which would 404)
const UPLOADS_DIR = path.join(process.cwd(), "public", "media");
const UPLOADS_URL_PATH = "/media";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

async function uploadToSupabaseStorage(opts: {
  filename: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const supabase = createSupabaseAdmin();
    const bucket = "media";
    const filePath = `uploads/${opts.filename}`;
    const body = Buffer.from(opts.bytes);

    // Create bucket if it doesn't exist (service role required).
    // If it already exists, Supabase returns an error; we can ignore and proceed.
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (created.error && !String(created.error.message || "").toLowerCase().includes("already exists")) {
      // Not fatal; upload may still work if bucket exists but create failed for other reasons.
    }

    const uploadRes = await supabase.storage.from(bucket).upload(filePath, body, {
      contentType: opts.contentType,
      upsert: true,
      cacheControl: "3600",
    });
    if (uploadRes.error) {
      return { ok: false, error: uploadRes.error.message };
    }

    const pub = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = pub.data.publicUrl;
    if (!publicUrl) return { ok: false, error: "Could not get public URL" };
    return { ok: true, url: publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Supabase upload failed" };
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, GIF, WebP, or SVG." }, { status: 400 });
    }

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : file.type === "image/gif"
            ? ".gif"
            : file.type === "image/svg+xml"
              ? ".svg"
              : ".jpg");
    const base = path.basename(file.name, path.extname(file.name)).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "upload";
    const filename = `${base}-${Date.now()}${ext}`;
    const bytes = await file.arrayBuffer();

    // Prefer Supabase Storage in production so uploads persist across deploys/restarts.
    const supabaseRes = await uploadToSupabaseStorage({ filename, bytes, contentType: file.type });
    if (supabaseRes.ok) {
      return NextResponse.json({ url: supabaseRes.url });
    }

    // Fallback: write into local public/ (works for local dev; may not persist on Render free tier).
    await mkdir(UPLOADS_DIR, { recursive: true });
    const filepath = path.join(UPLOADS_DIR, filename);
    await writeFile(filepath, Buffer.from(bytes));
    const url = `${UPLOADS_URL_PATH}/${filename}`;
    return NextResponse.json({ url, warning: supabaseRes.error });
  } catch (e) {
    console.error("[admin/upload-image] error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
