import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import DanceEntriesTable from "@/components/dashboard/DanceEntriesTable";
import HistoryCompetitionFilter from "@/components/dashboard/HistoryCompetitionFilter";
import { requireApprovedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import {
  getOwnRegistrations,
  removeSongForRegistration,
  uploadDanceMusic,
  uploadSongForRegistration,
} from "@/lib/queries/registrations";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { StudioManager } from "@/types/studioManager";
import { Registration } from "@/types/registration";
import styles from "./history.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  registrations: Registration[];
  manager: StudioManager;
};

// A read-only record of every dance ever registered — split out from the
// live /dashboard registration flow, 2026-10-07 (Dani): that flow's own
// "סיכום הזמנה" table now only shows the current round's still-unsubmitted
// dances (a specific order in progress, not a running history), so this is
// the one place to see everything — submitted or not, paid or not —
// organized the same way the table always was. Reuses DanceEntriesTable
// itself rather than a second table component, just without the סטטוס הגשה
// column (every row here already has a definite submission state, and
// editing/deleting a dance happens from the live flow, not from a
// historical record — so onEdit/onDelete are simply left unset).
export default function DashboardHistory({ competitions, registrations, manager }: Props) {
  const [entries, setEntries] = useState(registrations);
  const [competitionFilter, setCompetitionFilter] = useState<string | "all">("all");
  const visibleEntries =
    competitionFilter === "all" ? entries : entries.filter((e) => e.competitionId === competitionFilter);

  // Per Dani, 2026-10-06 (same as the live flow): a song can still be added
  // up to 10 days before the event even once a dance is locked by
  // submission, so this page needs the real upload wiring, not a stub.
  async function handleSongUpload(id: string, file: File, durationSeconds: number) {
    const path = await uploadDanceMusic(supabaseBrowserClient, manager.id, file);
    await uploadSongForRegistration(supabaseBrowserClient, id, path, durationSeconds);
    setEntries((current) =>
      current.map((e) =>
        e.id === id ? { ...e, songFilePath: path, songDurationSeconds: Math.round(durationSeconds) } : e
      )
    );
  }

  // Counterpart to handleSongUpload above — see its matching comment on
  // pages/dashboard/index.tsx.
  async function handleSongRemove(id: string) {
    await removeSongForRegistration(supabaseBrowserClient, id);
    setEntries((current) =>
      current.map((e) => (e.id === id ? { ...e, songFilePath: undefined, songDurationSeconds: undefined } : e))
    );
  }

  return (
    <>
      <Head>
        <title>היסטוריית הזמנות - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <header className={styles.pageHeader}>
        <Link href="/dashboard" className={styles.backLink}>
          → חזרה להרשמה לתחרויות
        </Link>
        <h1 className={styles.pageTitle}>היסטוריית הזמנות</h1>
        <p className={styles.pageSubtitle}>כל הריקודים שנרשמו אי פעם, כולל כאלו שכבר הוגשו ושולמו.</p>
      </header>

      <main className={styles.main}>
        <HistoryCompetitionFilter
          competitions={competitions}
          entries={entries}
          selectedId={competitionFilter}
          onSelect={setCompetitionFilter}
        />

        <div className={styles.wideTable}>
          <DanceEntriesTable
            entries={visibleEntries}
            competitions={competitions}
            onSongUpload={handleSongUpload}
            onSongRemove={handleSongRemove}
            showSubmissionColumn={false}
          />
        </div>
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

  const [competitions, registrations, manager] = await Promise.all([
    getCompetitionsWithPricing(supabase),
    getOwnRegistrations(supabase, studioManagerId),
    getOwnStudioManager(supabase, studioManagerId),
  ]);

  return { props: { competitions, registrations, manager: manager! } };
};
