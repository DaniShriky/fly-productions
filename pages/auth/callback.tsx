import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import AuthPageShell from "@/components/auth/AuthPageShell";
import authStyles from "@/components/auth/AuthPageShell.module.css";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { markJustLoggedIn } from "@/lib/justLoggedInFlag";
import { resolveLoginDestination } from "@/lib/resolveLoginDestination";

// Where GoogleSignInButton's redirect lands. supabase-js has
// detectSessionInUrl on by default, so by the time this component mounts
// the session from the OAuth redirect is already (or about to be)
// established — this just waits for it, then runs the exact same
// admin/approved/pending/rejected routing OTP login uses (see
// lib/resolveLoginDestination.ts), so Google and email-code login always
// land in the same place for the same account.
export default function AuthCallback({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();

      if (!session) {
        if (!cancelled) setMessage("ההתחברות נכשלה - נסו שוב.");
        return;
      }

      const destination = await resolveLoginDestination(supabaseBrowserClient, session.user.id);
      if (cancelled) return;

      if (destination.kind === "admin") {
        router.replace("/admin");
        return;
      }
      if (destination.kind === "approved") {
        markJustLoggedIn();
        router.replace("/dashboard");
        return;
      }
      if (destination.kind === "pending") {
        router.replace("/pending-approval");
        return;
      }
      if (destination.kind === "rejected") {
        setMessage("הבקשה שלך נדחתה. לפרטים נוספים, אנא צרי קשר איתנו.");
        return;
      }
      setMessage("לא מצאנו חשבון עם כתובת האימייל הזו - יש להירשם קודם.");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>מתחברת... - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="מתחברת...">
        <p className={authStyles.hint}>{message ?? "רק רגע, מעבירים אותך..."}</p>
        {message && (
          <p className={authStyles.hint}>
            <Link href="/login">חזרה לכניסת מנהלים</Link>
          </p>
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
