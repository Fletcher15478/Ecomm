import { getAdminSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Use /media so URLs don't conflict with app/uploads/ route (which would 404)
const UPLOADS_DIR = path.join(process.cwd(), "public", "media");
const UPLOADS_URL_PATH = "/media";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

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
      return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." }, { status: 400 });
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
    const base = path.basename(file.name, path.extname(file.name)).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "upload";
    const filename = `${base}-${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
    const url = `${UPLOADS_URL_PATH}/${filename}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[admin/upload-image] error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
