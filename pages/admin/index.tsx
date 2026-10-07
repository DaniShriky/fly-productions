import { useEffect, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import PendingApprovalsTable from "@/components/admin/PendingApprovalsTable";
import CompetitionTypeRequestsTable from "@/components/admin/CompetitionTypeRequestsTable";
import ApprovedManagersTable from "@/components/admin/ApprovedManagersTable";
import RegistrationsPaymentsTable from "@/components/admin/RegistrationsPaymentsTable";
import RegistrationCutoffEditor from "@/components/admin/RegistrationCutoffEditor";
import AdminTabs, { AdminTab } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  getApprovedStudioManagers,
  getPendingCompetitionTypeRequests,
  getPendingStudioManagers,
} from "@/lib/queries/studioManagers";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { getAllRegistrationsForAdmin } from "@/lib/queries/adminRegistrations";
import { getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { getOwnAdmin } from "@/lib/queries/admins";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import styles from "./index.module.css";

// Redesigned 2026-10-05 (per Dani: "נוח, מובן, פשוט וברור... כמה שפחות עומס
// מידע לא רלוונטי") from one long page stacking all four sections — tabs
// mean only one section is ever on screen at a time, and the badge on
// "בקשות ממתינות" surfaces what actually needs a decision without having to
// scroll past the (usually much longer) payments table to find it.
export default function AdminIndex({
  competitions,
  managers,
  competitionTypeRequests,
  approvedManagers,
  registrations,
  competitionsWithPricing,
  adminName,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [activeTab, setActiveTab] = useState<AdminTab>("pending");

  // Starts from the server-rendered counts, then tracks live — the "pending"
  // tab's two tables only exist in the DOM (and only run their own realtime
  // subscriptions) while that tab is actually active, so without this the
  // badge would go stale the moment the admin switches away from it. A
  // separate, lightweight subscription here (re-fetches just the two counts,
  // not full rows) is simpler than keeping both tables mounted-but-hidden
  // just to keep their internal state alive.
  const [pendingManagersCount, setPendingManagersCount] = useState(managers.length);
  const [pendingTypeRequestsCount, setPendingTypeRequestsCount] = useState(competitionTypeRequests.length);

  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel("admin-tabs-pending-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_managers" }, () => {
        getPendingStudioManagers(supabaseBrowserClient)
          .then((rows) => setPendingManagersCount(rows.length))
          .catch((err) => console.error("Live pending-managers count refresh failed:", err));
        getPendingCompetitionTypeRequests(supabaseBrowserClient)
          .then((rows) => setPendingTypeRequestsCount(rows.length))
          .catch((err) => console.error("Live pending-type-requests count refresh failed:", err));
      })
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  // Same sticky-below-Nav technique as pages/dashboard/index.tsx — Nav is
  // itself position:sticky with no fixed height, so the tab bar's own `top`
  // is measured from Nav's real rendered height instead of guessed.
  const [navHeight, setNavHeight] = useState(0);
  useEffect(() => {
    const navEl = document.querySelector("nav");
    if (!navEl) return;

    const updateHeight = () => setNavHeight(navEl.getBoundingClientRect().height);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(navEl);
    return () => resizeObserver.disconnect();
  }, []);

  const pendingCount = pendingManagersCount + pendingTypeRequestsCount;

  return (
    <>
      <Head>
        <title>ניהול האתר - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <header className={styles.pageHeader}>
        <p className={styles.greeting}>{adminName ? `שלום ${adminName}, איזה כיף שאת פה!` : "שלום! איזה כיף שאת פה!"}</p>
        <h1 className={styles.pageTitle}>ניהול האתר</h1>
        <p className={styles.pageSubtitle}>בקשות ממתינות, ריקודים ותשלומים, ומועדי הרשמה - הכל במקום אחד.</p>
      </header>

      <div className={styles.stickyTabs} style={{ top: navHeight }}>
        <AdminTabs active={activeTab} onSelect={setActiveTab} counts={{ pending: pendingCount }} />
      </div>

      <main className={styles.main}>
        {activeTab === "pending" && (
          <>
            <h2 className={styles.sectionTitle}>בקשות הרשמה ממתינות</h2>
            <PendingApprovalsTable initialManagers={managers} />

            <h2 className={`${styles.sectionTitle} ${styles.sectionGap}`}>בקשות שינוי סוג תחרויות</h2>
            <CompetitionTypeRequestsTable initialManagers={competitionTypeRequests} />
          </>
        )}

        {activeTab === "managers" && <ApprovedManagersTable initialManagers={approvedManagers} />}

        {activeTab === "registrations" && (
          <RegistrationsPaymentsTable initialRegistrations={registrations} competitions={competitionsWithPricing} />
        )}

        {activeTab === "dates" && <RegistrationCutoffEditor competitions={competitionsWithPricing} />}
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const guard = await requireAdmin(context);
  if (guard) return guard;

  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [managers, competitionTypeRequests, approvedManagers, competitions, registrations, competitionsWithPricing, admin] =
    await Promise.all([
      getPendingStudioManagers(supabase),
      getPendingCompetitionTypeRequests(supabase),
      getApprovedStudioManagers(supabase),
      getAllCompetitions(),
      getAllRegistrationsForAdmin(supabase),
      getCompetitionsWithPricing(supabase),
      getOwnAdmin(supabase, user!.id),
    ]);

  return {
    props: {
      managers,
      competitionTypeRequests,
      approvedManagers,
      competitions,
      registrations,
      competitionsWithPricing,
      adminName: admin?.name ?? null,
    },
  };
};
