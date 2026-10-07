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
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { markJustLoggedIn } from "@/lib/justLoggedInFlag";
import { resolveLoginDestination } from "@/lib/resolveLoginDestination";

export default function Login({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Same routing /auth/callback uses after "Continue with Google" — see
  // lib/resolveLoginDestination.ts — so email-code and Google sign-in always
  // land in the same place for the same account.
  async function handleVerified(userId: string) {
    const destination = await resolveLoginDestination(supabaseBrowserClient, userId);

    if (destination.kind === "admin") {
      router.push("/admin");
      return;
    }
    if (destination.kind === "not_found") {
      setStatusMessage("לא מצאנו את הפרטים שלכם. אנא צרו קשר איתנו.");
      return;
    }
    if (destination.kind === "approved") {
      markJustLoggedIn();
      router.push("/dashboard");
      return;
    }
    if (destination.kind === "pending") {
      router.push("/pending-approval");
      return;
    }

    setStatusMessage("הבקשה שלכם נדחתה. לפרטים נוספים, אנא צרו קשר איתנו.");
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
            <div className={authStyles.divider}>
              <span>או</span>
            </div>
            <GoogleSignInButton />
            <p className={authStyles.hint}>
              עדיין לא נרשמתם? <Link href="/register">הרשמה כמנהל/ת סטודיו/להקה</Link>
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
