import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { validateApiKey } from "@/lib/api-auth";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided in form-data field 'file'" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type — use JPG, PNG, WebP, GIF, or AVIF" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large — 8MB max" }, { status: 400 });
    }

    const ext = (file.type.split("/")[1] || "bin").replace("jpeg", "jpg");
    const filename = `payment-proofs/${Date.now()}-${randomUUID()}.${ext}`;

    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error("[api/v1/upload-proof] Blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed — please check BLOB_READ_WRITE_TOKEN and try again." }, { status: 500 });
  }
}
