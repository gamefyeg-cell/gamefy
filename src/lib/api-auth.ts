import { NextResponse } from "next/server";

/**
 * Validates the API key from incoming request headers.
 * Looks for:
 * 1. `x-api-key: <KEY>`
 * 2. `Authorization: Bearer <KEY>`
 *
 * Compares against process.env.API_SECRET_KEY.
 *
 * If valid, returns null. If invalid or missing, returns an unauthorized NextResponse.
 */
export function validateApiKey(req: Request): NextResponse | null {
  const configuredKey = process.env.API_SECRET_KEY?.trim();

  if (!configuredKey) {
    return NextResponse.json(
      {
        error: "API_SECRET_KEY is not configured on the server. Please set it in environment variables.",
      },
      { status: 500 }
    );
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");

  let providedKey: string | null = null;

  if (apiKeyHeader) {
    providedKey = apiKeyHeader.trim();
  } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedKey = authHeader.slice(7).trim();
  }

  if (!providedKey || providedKey !== configuredKey) {
    return NextResponse.json(
      {
        error: "Unauthorized: Invalid or missing API key. Provide a valid key via 'x-api-key' or 'Authorization: Bearer <key>'.",
      },
      { status: 401 }
    );
  }

  return null;
}
