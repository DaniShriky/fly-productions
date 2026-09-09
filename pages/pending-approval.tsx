import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import AuthPageShell from "@/components/auth/AuthPageShell";
import authStyles from "@/components/auth/AuthPageShell.module.css";
import { getAllCompetitions } from "@/lib/queries/competitions";

export default function PendingApproval({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>ממתינה לאישור - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="הבקשה שלך נקלטה">
        <p className={authStyles.hint}>
          ההרשמה שלך ממתינה לאישור מנהל. נעדכן אותך ברגע שהחשבון יאושר, ואז תוכלי להתחבר.
        </p>
      </AuthPageShell>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const competitions = await getAllCompetitions();
  return { props: { competitions } };
};
