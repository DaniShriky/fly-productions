// Supabase/Postgrest errors (RLS denials, a raise exception inside an RPC,
// a network failure) all carry a `.message` — surfacing it, not just a
// generic "failed, try again," is what actually lets a real permissions/
// data problem get told apart from a flaky network blip. Shared after the
// same extraction logic started showing up in more than one admin table's
// catch block (2026-10-06).
export function errorDetail(err: unknown): string | null {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return null;
}
