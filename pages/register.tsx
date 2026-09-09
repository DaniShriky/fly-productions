import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import AuthPageShell from "@/components/auth/AuthPageShell";
import authStyles from "@/components/auth/AuthPageShell.module.css";
import RegistrationDetailsForm, { RegistrationDetails } from "@/components/auth/RegistrationDetailsForm";
import OtpEmailForm from "@/components/auth/OtpEmailForm";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getAllCompetitions } from "@/lib/queries/competitions";

export default function Register({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const [details, setDetails] = useState<RegistrationDetails | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);

  async function handleVerified(userId: string, email: string) {
    if (!details) return;

    const { error } = await supabaseBrowserClient.from("studio_managers").insert({
      id: userId,
      studio_name: details.studioName,
      phone: details.phone,
      email,
      referral_source: details.referralSource || null,
      preferred_competition_type: details.preferredCompetitionType === "religious" ? "דתי" : "רגיל",
    });

    if (error) {
      if (error.code === "23505") {
        setInsertError("כבר נרשמת בעבר עם אימייל זה.");
        return;
      }
      setInsertError("משהו השתבש בשמירת הפרטים. נסי שוב.");
      return;
    }

    router.push("/pending-approval");
  }

  return (
    <>
      <Head>
        <title>הרשמת מנהלת סטודיו/להקה - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="הרשמת מנהלת סטודיו/להקה">
        {!details ? (
          <RegistrationDetailsForm onSubmit={setDetails} />
        ) : (
          <>
            <OtpEmailForm mode="register" onVerified={handleVerified} />
            {insertError && (
              <p className={authStyles.error}>
                {insertError} <Link href="/login">כניסה</Link>
              </p>
            )}
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
