import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import AuthPageShell from "@/components/auth/AuthPageShell";
import authStyles from "@/components/auth/AuthPageShell.module.css";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { PHONE, PHONE_TEL_URL, WHATSAPP_URL } from "@/lib/contact";

function ClockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export default function PendingApproval({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>ממתינה לאישור - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="הבקשה שלך נקלטה">
        <span className={authStyles.pendingIcon}>
          <ClockIcon />
        </span>
        <p className={authStyles.hint}>
          ההרשמה שלך ממתינה לאישור מנהל. נעדכן אותך באימייל ברגע שהחשבון יאושר, ואז תוכלו להתחבר.
        </p>
        <p className={authStyles.hint}>
          לוקח יותר מכמה ימים ולא שמעת מאיתנו? אפשר לפנות אלינו ישירות: <a href={PHONE_TEL_URL}>{PHONE}</a> או ב-
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          .
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
