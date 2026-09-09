import Head from "next/head";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import { requireApprovedManager } from "@/lib/auth";
import { getAllCompetitions } from "@/lib/queries/competitions";

// Minimal stub — real dashboard content (registrations, payments, orders) is
// Phase 4. This exists now purely so /login has a real, session-gated
// redirect target for approved managers.
export default function Dashboard({ competitions }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>לוח בקרה - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main style={{ padding: "60px 5%" }}>
        <h1>לוח הבקרה בקרוב</h1>
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const guard = await requireApprovedManager(context);
  if (guard) return guard;

  const competitions = await getAllCompetitions();
  return { props: { competitions } };
};
