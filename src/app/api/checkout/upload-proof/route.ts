import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

// Public upload endpoint for checkout payment-proof screenshots — separate
// from /api/admin/upload on purpose: that one requires an admin session,
// and buyers placing an order are never admins. Same validation rails
// (mime whitelist, size cap) since it's just as unauthenticated as any
// other checkout field. Stored in Vercel Blob under a payment-proofs/
// prefix, same reasoning as the admin route: a serverless filesystem can't
// durably hold uploaded files, so this can't write to public/uploads.

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
  const filename = `payment-proofs/${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[api/checkout/upload-proof] Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again." }, { status: 500 });
  }
}
