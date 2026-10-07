// Supabase Storage rejects object keys containing characters outside a
// strict allowlist — a real uploaded file's original name (e.g. "Fly
// productions - Dance (128k).mp3", spaces and parentheses included) fails
// with "Invalid key", not a permissions error, found 2026-10-06 when a
// manager's music upload silently/then-visibly failed. Used wherever an
// original filename gets folded into a storage path (dance music, profile
// photos) — replaces anything that isn't alphanumeric/dot/hyphen/underscore
// with an underscore, keeping the name still readable.
//
// The `+` (collapse a whole *run* of invalid characters into one
// underscore) matters — found 2026-10-07 when a name with several
// consecutive spaces/punctuation marks turned into a long stretch of
// individual underscores that rendered as what looked like a stray
// horizontal line in the UI (each invalid character was getting its own
// underscore before this).
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]+/g, "_");
}
