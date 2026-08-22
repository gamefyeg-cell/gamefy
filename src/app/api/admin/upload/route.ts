import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";

// Admin image upload (product/category/collection/homepage-block images) —
// stored in Vercel Blob rather than local disk. A serverless deployment's
// filesystem is read-only outside /tmp (and /tmp doesn't persist across
// invocations), so writeFile() to public/uploads only ever worked in local
// dev; every upload in production was silently 500ing. Blob needs no server
// disk at all and gives back a permanent public URL directly.

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type — use JPG, PNG, WebP, GIF, or AVIF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — 8MB max" }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] || "bin").replace("jpeg", "jpg");
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[api/admin/upload] Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed — storage isn't configured correctly." }, { status: 500 });
  }
}
