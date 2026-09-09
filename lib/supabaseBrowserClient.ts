import { createBrowserClient } from "@supabase/ssr";

// Browser-side client for the auth pages (login/register OTP calls, admin
// approve/reject buttons) — needs NEXT_PUBLIC_-prefixed env vars since this
// code ships to the browser bundle. Distinct from lib/supabase.ts, which is
// anon-only and build-time-only for the public competitions/testimonials data.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables");
}

export const supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
