import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import AuthPageShell from "@/components/auth/AuthPageShell";
import authStyles from "@/components/auth/AuthPageShell.module.css";
import OtpEmailForm from "@/components/auth/OtpEmailForm";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { getAllCompetitions } from "@/lib/queries/competitions";

export default function Login({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleVerified(userId: string) {
    const { data: adminRow } = await supabaseBrowserClient
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminRow) {
      router.push("/admin");
      return;
    }

    const manager = await getOwnStudioManager(supabaseBrowserClient, userId);

    if (!manager) {
      setStatusMessage("לא מצאנו את הפרטים שלך. אנא צרי קשר איתנו.");
      return;
    }

    if (manager.status === "approved") {
      router.push("/dashboard");
      return;
    }

    if (manager.status === "pending") {
      router.push("/pending-approval");
      return;
    }

    setStatusMessage("הבקשה שלך נדחתה. לפרטים נוספים, אנא צרי קשר איתנו.");
  }

  return (
    <>
      <Head>
        <title>כניסת מנהלים - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="כניסת מנהלים">
        {statusMessage ? (
          <p className={authStyles.hint}>{statusMessage}</p>
        ) : (
          <>
            <OtpEmailForm mode="login" onVerified={handleVerified} />
            <p className={authStyles.hint}>
              עדיין לא נרשמת? <Link href="/register">הרשמה כמנהלת סטודיו/להקה</Link>
            </p>
          </>
        )}
      </AuthPageShell>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const competitions = await getAllCompetitions();
  return { props: { competitions } };
};
