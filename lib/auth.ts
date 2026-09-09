import type { GetServerSidePropsContext, Redirect } from "next";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type Guard = { redirect: Redirect } | null;

// Both guards return `null` when the request may proceed, or a `redirect`
// result to return as-is from getServerSideProps:
//   const guard = await requireAdmin(context);
//   if (guard) return guard;

export async function requireAdmin(context: GetServerSidePropsContext): Promise<Guard> {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const { data: adminRow } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!adminRow) {
    // Redirect to the homepage rather than a "forbidden" page, so a
    // non-admin can't even confirm this route exists.
    return { redirect: { destination: "/", permanent: false } };
  }

  return null;
}

export async function requireApprovedManager(context: GetServerSidePropsContext): Promise<Guard> {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const { data: managerRow } = await supabase
    .from("studio_managers")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (managerRow?.status !== "approved") {
    return { redirect: { destination: "/pending-approval", permanent: false } };
  }

  return null;
}
