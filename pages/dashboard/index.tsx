import { useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import ProfileCard from "@/components/dashboard/ProfileCard";
import EarlyRegistrationStatus from "@/components/dashboard/EarlyRegistrationStatus";
import DanceEntryForm from "@/components/dashboard/DanceEntryForm";
import DanceEntriesTable from "@/components/dashboard/DanceEntriesTable";
import { requireApprovedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { DanceEntryInput, deleteDanceEntry, getOwnRegistrations, upsertDanceEntry } from "@/lib/queries/registrations";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { StudioManager } from "@/types/studioManager";
import { Registration } from "@/types/registration";
import styles from "./index.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  registrations: Registration[];
  manager: StudioManager;
};

export default function Dashboard({ competitions, registrations, manager }: Props) {
  const [entries, setEntries] = useState(registrations);
  const [editingEntry, setEditingEntry] = useState<Registration | null>(null);

  async function handleSubmit(entry: DanceEntryInput, existingId?: string) {
    const saved = await upsertDanceEntry(supabaseBrowserClient, manager.id, entry, existingId);

    setEntries((current) =>
      existingId ? current.map((e) => (e.id === existingId ? saved : e)) : [...current, saved]
    );
  }

  async function handleDelete(id: string) {
    await deleteDanceEntry(supabaseBrowserClient, id);
    setEntries((current) => current.filter((e) => e.id !== id));
    if (editingEntry?.id === id) setEditingEntry(null);
  }

  return (
    <>
      <Head>
        <title>לוח בקרה - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <p className={styles.kicker}>לוח בקרה</p>
          <h1 className={styles.pageTitle}>שלום, {manager.studioName}</h1>
          <p className={styles.pageSubtitle}>כאן תוכלי לעקוב אחרי ההרשמה שלך ולנהל את הריקודים לתחרויות.</p>
        </header>

        <ProfileCard manager={manager} />

        <div className={styles.divider} />

        <EarlyRegistrationStatus competitions={competitions} />

        <div className={styles.divider} />

        <section>
          <p className={styles.kicker}>שלב 2</p>
          <h2 className={styles.title}>הרשמה סופית</h2>
          <p className={styles.hint}>
            כשיש לך מספרים סופיים לכל ריקוד — ניתן למלא ולשלוח כאן. השליחה עדיין אינה תשלום, וההרשמה תיחשב סופית רק
            לאחר תשלום בפועל.
          </p>

          <DanceEntryForm
            studioManagerId={manager.id}
            competitions={competitions}
            entries={entries}
            editingEntry={editingEntry}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditingEntry(null)}
          />

          <DanceEntriesTable
            entries={entries}
            competitions={competitions}
            onEdit={setEditingEntry}
            onDelete={handleDelete}
          />
        </section>
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
