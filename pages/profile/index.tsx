import { useCallback, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import ProfileEditForm from "@/components/dashboard/ProfileEditForm";
import AdminProfileForm from "@/components/admin/AdminProfileForm";
import LiveNotifications from "@/components/dashboard/LiveNotifications";
import { requireApprovedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { getOwnAdmin } from "@/lib/queries/admins";
import { StudioManager } from "@/types/studioManager";
import { Admin } from "@/types/admin";
import styles from "./index.module.css";

type ManagerProps = {
  isAdmin: false;
  competitions: CompetitionWithPricing[];
  manager: StudioManager;
};

type AdminProps = {
  isAdmin: true;
  competitions: CompetitionWithPricing[];
  admin: Admin;
};

type Props = ManagerProps | AdminProps;

// Split out of /dashboard so the nav's profile menu can point to a page
// that's actually just "who you are" — separate from /dashboard, which is
// the studio manager's registration workflow. Also reachable by an admin
// account (same Nav menu item, same "הפרטים שלי" URL) — per Dani, 2026-10-05:
// an admin used to land on /pending-approval here, since requireApprovedManager
// only ever checks studio_managers and an admin has no row there at all.
// getServerSideProps checks the admins table first and renders a
// deliberately minimal AdminProfile (name + photo only) in that case.
export default function Profile(props: Props) {
  if (props.isAdmin) {
    return <AdminProfile competitions={props.competitions} initialAdmin={props.admin} />;
  }
  return <ManagerProfile competitions={props.competitions} initialManager={props.manager} />;
}

function AdminProfile({ competitions, initialAdmin }: { competitions: CompetitionWithPricing[]; initialAdmin: Admin }) {
  const [admin, setAdmin] = useState(initialAdmin);

  return (
    <>
      <Head>
        <title>הפרטים שלי - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>הפרטים שלי</h1>
        </header>

        <AdminProfileForm admin={admin} onSaved={setAdmin} />
      </main>

      <Footer />
    </>
  );
}

function ManagerProfile({
  competitions,
  initialManager,
}: {
  competitions: CompetitionWithPricing[];
  initialManager: StudioManager;
}) {
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
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const { data: adminRow } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();

  if (adminRow) {
    const [competitions, admin] = await Promise.all([
      getCompetitionsWithPricing(supabase),
      getOwnAdmin(supabase, user.id),
    ]);
    return { props: { isAdmin: true, competitions, admin: admin ?? { userId: user.id } } };
  }

  const guard = await requireApprovedManager(context);
  if (guard) return guard;

  const [competitions, manager] = await Promise.all([
    getCompetitionsWithPricing(supabase),
    getOwnStudioManager(supabase, user.id),
  ]);

  return { props: { isAdmin: false, competitions, manager: manager! } };
};
