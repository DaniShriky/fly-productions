import { createClient } from "@supabase/supabase-js";

// Server-only client — every call site is inside getStaticProps/getServerSideProps
// (build/server time), so these env vars are deliberately not NEXT_PUBLIC_-prefixed
// and never reach the browser bundle.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
