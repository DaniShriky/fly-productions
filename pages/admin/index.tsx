import Head from "next/head";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import PendingApprovalsTable from "@/components/admin/PendingApprovalsTable";
import CompetitionTypeRequestsTable from "@/components/admin/CompetitionTypeRequestsTable";
import RegistrationsPaymentsTable from "@/components/admin/RegistrationsPaymentsTable";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getPendingCompetitionTypeRequests, getPendingStudioManagers } from "@/lib/queries/studioManagers";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { getAllRegistrationsForAdmin } from "@/lib/queries/adminRegistrations";
import { getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";

export default function AdminIndex({
  competitions,
  managers,
  competitionTypeRequests,
  registrations,
  competitionsWithPricing,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>אישורי מנהלות - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main style={{ padding: "60px 5%" }}>
        <h1 style={{ marginBottom: 24 }}>בקשות הרשמה ממתינות</h1>
        <PendingApprovalsTable initialManagers={managers} />

        <h1 style={{ margin: "40px 0 24px" }}>בקשות שינוי סוג תחרויות</h1>
        <CompetitionTypeRequestsTable initialManagers={competitionTypeRequests} />

        <h1 style={{ margin: "40px 0 24px" }}>ריקודים ותשלומים</h1>
        <RegistrationsPaymentsTable initialRegistrations={registrations} competitions={competitionsWithPricing} />
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const guard = await requireAdmin(context);
  if (guard) return guard;

  const supabase = createSupabaseServerClient(context);
  const [managers, competitionTypeRequests, competitions, registrations, competitionsWithPricing] = await Promise.all([
    getPendingStudioManagers(supabase),
    getPendingCompetitionTypeRequests(supabase),
    getAllCompetitions(),
    getAllRegistrationsForAdmin(supabase),
    getCompetitionsWithPricing(supabase),
  ]);

  return { props: { managers, competitionTypeRequests, competitions, registrations, competitionsWithPricing } };
};
