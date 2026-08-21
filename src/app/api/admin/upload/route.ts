import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";

// Local-disk image upload for admin content (product/category/collection
// images). Files land in public/uploads and are served directly by Next's
// static file handling — good enough for a single-instance deployment; a
// multi-instance/production deploy would swap this for S3/R2/Blob storage
// behind the same "return { url }" contract, no caller changes needed.

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
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
