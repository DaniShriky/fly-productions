import Head from "next/head";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import PendingApprovalsTable from "@/components/admin/PendingApprovalsTable";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getPendingStudioManagers } from "@/lib/queries/studioManagers";
import { getAllCompetitions } from "@/lib/queries/competitions";

export default function AdminIndex({ competitions, managers }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>אישורי מנהלות - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main style={{ padding: "60px 5%" }}>
        <h1 style={{ marginBottom: 24 }}>בקשות הרשמה ממתינות</h1>
        <PendingApprovalsTable initialManagers={managers} />
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const guard = await requireAdmin(context);
  if (guard) return guard;

  const supabase = createSupabaseServerClient(context);
  const [managers, competitions] = await Promise.all([getPendingStudioManagers(supabase), getAllCompetitions()]);

  return { props: { managers, competitions } };
};
