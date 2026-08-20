import crypto from "node:crypto";

// AES-256-GCM encryption for delivered keys/credentials at rest
// (plan §5: "Encrypt delivered account credentials at rest ... decrypt only
// at point of display"). Key comes from ENCRYPTION_KEY (64 hex chars = 32
// bytes) — in production this should live in a real secrets manager, not a
// plain env var, but the encryption itself is real, not a stub.

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes) — see .env.example"
    );
  }
  return Buffer.from(hex, "hex");
}

/// Encrypts plaintext (a key code, or JSON-stringified account credentials)
/// into a single "iv:authTag:ciphertext" hex string suitable for a String column.
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

/// Reverses encryptSecret. Call this only at the point of one-time reveal
/// to the buyer/admin — never log or cache the plaintext result.
export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
