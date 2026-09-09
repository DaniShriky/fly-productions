import type { GetServerSidePropsContext } from "next";
import { createServerClient } from "@supabase/ssr";
import { stringifySetCookie } from "cookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables");
}

// A fresh client per request, reading the session from the request's cookies
// and writing any refreshed session back onto the response — only usable
// inside getServerSideProps (needs the raw req/res), never shared across
// requests. See lib/auth.ts for the guards built on top of this.
export function createSupabaseServerClient({ req, res }: Pick<GetServerSidePropsContext, "req" | "res">) {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies).map(([name, value]) => ({ name, value: value ?? "" }));
      },
      setAll(cookiesToSet) {
        const existing = res.getHeader("Set-Cookie");
        const existingCookies = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
        const newCookies = cookiesToSet.map(({ name, value, options }) => stringifySetCookie({ name, value, ...options }));
        res.setHeader("Set-Cookie", [...existingCookies, ...newCookies]);
      },
    },
  });
}
