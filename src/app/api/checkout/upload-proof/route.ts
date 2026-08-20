import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Public upload endpoint for checkout payment-proof screenshots — separate
// from /api/admin/upload on purpose: that one requires an admin session,
// and buyers placing an order are never admins. Same validation rails
// (mime whitelist, size cap) since it's just as unauthenticated as any
// other checkout field, but files land in their own uploads/payment-proofs
// subfolder so they're never mixed up with admin-managed product/category
// imagery.

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
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
  const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/payment-proofs/${filename}` });
}
