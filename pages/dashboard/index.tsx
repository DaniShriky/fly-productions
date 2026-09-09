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
import { DanceEntryInput, getOwnRegistrations, upsertDanceEntry } from "@/lib/queries/registrations";
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

  return (
    <>
      <Head>
        <title>לוח בקרה - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main className={styles.main}>
        <ProfileCard manager={manager} />

        <EarlyRegistrationStatus competitions={competitions} />

        <section>
          <h2 className={styles.title}>הרשמה סופית</h2>
          <p className={styles.hint}>
            כשיש לך מספרים סופיים לכל ריקוד — ניתן למלא ולשלוח כאן. השליחה עדיין אינה תשלום, וההרשמה תיחשב סופית רק
            לאחר תשלום בפועל.
          </p>

          <DanceEntryForm
            competitions={competitions}
            editingEntry={editingEntry}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditingEntry(null)}
          />

          <DanceEntriesTable entries={entries} competitions={competitions} onEdit={setEditingEntry} />
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
