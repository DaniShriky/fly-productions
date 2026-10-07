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
  // Separate from `details` — going back no longer clears what was typed
  // (it used to: `details` was the ONLY thing deciding which step showed,
  // so "back" meant nulling it out, losing everything already filled in).
  const [step, setStep] = useState<"details" | "verify">("details");
  const [insertError, setInsertError] = useState<string | null>(null);

  function handleDetailsSubmit(submitted: RegistrationDetails) {
    setDetails(submitted);
    setStep("verify");
  }

  async function handleVerified(userId: string, email: string) {
    if (!details) return;

    // dance_styles and wants_stage_services_info are no longer collected at
    // registration (2026-10-02, Dani) — both columns stay nullable/default
    // false, settable later from /profile instead.
    const { error } = await supabaseBrowserClient.from("studio_managers").insert({
      id: userId,
      studio_name: details.studioName,
      manager_name: details.managerName,
      phone: details.phone,
      email,
      city: details.city,
      referral_source: details.referralSource || null,
      preferred_competition_type: details.preferredCompetitionType === "religious" ? "מגזר דתי" : "חילוני",
    });

    if (error) {
      if (error.code === "23505") {
        setInsertError("כבר נרשמתם בעבר עם אימייל זה.");
        return;
      }
      setInsertError("משהו השתבש בשמירת הפרטים. נסו שוב.");
      return;
    }

    router.push("/pending-approval");
  }

  return (
    <>
      <Head>
        <title>הרשמת מנהל/ת סטודיו/להקה - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <AuthPageShell title="הרשמת מנהל/ת סטודיו/להקה" step={{ current: step === "details" ? 1 : 2, total: 2 }}>
        {step === "details" ? (
          <RegistrationDetailsForm onSubmit={handleDetailsSubmit} initialValues={details ?? undefined} />
        ) : (
          <>
            <button type="button" className={authStyles.backLink} onClick={() => setStep("details")}>
              → חזרה לעריכת הפרטים
            </button>
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
