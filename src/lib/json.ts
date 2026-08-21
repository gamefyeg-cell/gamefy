// Helpers for the fields that are `Json` on Postgres but stored as JSON-text
// `String` columns on SQLite (see prisma/schema.prisma header note).

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseStringArray(value: string | null | undefined): string[] {
  return parseJson<string[]>(value, []);
}

export function readCustomFieldValues(raw: string | null | undefined): Record<string, string> {
  return parseJson<Record<string, string>>(raw, {});
}
