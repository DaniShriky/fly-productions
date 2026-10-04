import { useCallback, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import ProfileEditForm from "@/components/dashboard/ProfileEditForm";
import LiveNotifications from "@/components/dashboard/LiveNotifications";
import { requireApprovedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { StudioManager } from "@/types/studioManager";
import styles from "./index.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  manager: StudioManager;
};

// Split out of /dashboard so the nav's profile menu can point to a page
// that's actually just "who you are" (studio/contact details from
// registration) — separate from /dashboard, which is the registration
// workflow itself (early-registration status + final per-dance registration).
export default function Profile({ competitions, manager: initialManager }: Props) {
  const [manager, setManager] = useState(initialManager);

  // Per Dani, 2026-10-03: approving/rejecting a pending competition-type
  // request used to leave this exact page — the one showing the radio
  // buttons and approval-note text — stuck on the pre-decision state until
  // a manual refresh, even though the popup notification already fired.
  const handleManagerUpdated = useCallback(
    (update: { preferredCompetitionType: string | null; pendingPreferredCompetitionType: string | null }) => {
      setManager((current) => ({
        ...current,
        ...(update.preferredCompetitionType ? { preferredCompetitionType: update.preferredCompetitionType } : {}),
        ...(update.pendingPreferredCompetitionType
          ? { pendingPreferredCompetitionType: update.pendingPreferredCompetitionType }
          : { pendingPreferredCompetitionType: undefined }),
      }));
    },
    []
  );

  return (
    <>
      <Head>
        <title>הפרטים שלי - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <LiveNotifications managerId={manager.id} onManagerUpdated={handleManagerUpdated} />

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>הפרטים שלי</h1>
          <p className={styles.pageSubtitle}>הפרטים שמילאת בהרשמת הסטודיו/הלהקה שלך - ניתן לעדכן אותם כאן.</p>
        </header>

        <ProfileEditForm manager={manager} onSaved={setManager} />
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const guard = await requireApprovedManager(context);
  if (guard) return guard;

  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const studioManagerId = user!.id;

  const [competitions, manager] = await Promise.all([
    getCompetitionsWithPricing(supabase),
    getOwnStudioManager(supabase, studioManagerId),
  ]);

  return { props: { competitions, manager: manager! } };
};
