import { useEffect, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import DashboardBanner from "@/components/dashboard/DashboardBanner";
import RegistrationStepper, { RegistrationStep } from "@/components/dashboard/RegistrationStepper";
import EarlyRegistrationStatus from "@/components/dashboard/EarlyRegistrationStatus";
import Step2FinalRegistration from "@/components/dashboard/Step2FinalRegistration";
import StepHeader from "@/components/dashboard/StepHeader";
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
  // A returning manager who already has dances on file almost always came
  // back to add more of them, not to re-read step 1's reminder — so she
  // lands straight on step 2. A first-time visitor with nothing yet starts
  // at step 1, where the actual entry point (the external form) lives.
  const [activeStep, setActiveStep] = useState<RegistrationStep>(registrations.length === 0 ? 1 : 2);
  const [pendingEditEntry, setPendingEditEntry] = useState<Registration | null>(null);

  // Nav (components/shared/Nav.tsx) is itself position:sticky at top:0, so
  // this bar has to stick just below it rather than at top:0 too — otherwise
  // the two would overlap instead of stacking. Measuring Nav's real rendered
  // height (instead of hardcoding it) keeps this correct across the mobile
  // breakpoint where Nav's own padding/logo size shrink.
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

  function handleEditFromSummary(entry: Registration) {
    setPendingEditEntry(entry);
    setActiveStep(2);
  }

  async function handleSubmit(entry: DanceEntryInput, existingId?: string) {
    const saved = await upsertDanceEntry(supabaseBrowserClient, manager.id, entry, existingId);

    setEntries((current) =>
      existingId ? current.map((e) => (e.id === existingId ? saved : e)) : [...current, saved]
    );
  }

  async function handleDelete(id: string) {
    await deleteDanceEntry(supabaseBrowserClient, id);
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  return (
    <>
      <Head>
        <title>הרשמה לתחרויות - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <DashboardBanner />

      <div className={styles.stickyHeader} style={{ top: navHeight }}>
        <header className={styles.pageHeader}>
          <p className={styles.pageSubtitle}>כאן תוכלי לעקוב אחרי ההרשמה שלך ולנהל את הריקודים לתחרויות.</p>
        </header>

        <RegistrationStepper active={activeStep} onSelect={setActiveStep} />
      </div>

      <main className={styles.main}>
        {activeStep === 1 && (
          <div className={styles.narrow}>
            <EarlyRegistrationStatus />
          </div>
        )}

        {activeStep === 2 && (
          <div className={styles.narrow}>
            <Step2FinalRegistration
              studioManagerId={manager.id}
              competitions={competitions}
              entries={entries}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              initialEditEntry={pendingEditEntry}
              onInitialEditConsumed={() => setPendingEditEntry(null)}
            />
          </div>
        )}

        {activeStep === 3 && (
          <>
            <div className={styles.narrow}>
              <StepHeader
                kicker="שלב 3"
                title="סיכום ותשלום"
                hint='לפני התשלום, בדקו שכל פרטי הריקודים שהוספתם נכונים.'
              />
            </div>

            {/* Outside .narrow deliberately — the entries table has a lot of
                columns to show, so it uses the full page width instead of
                being squeezed into the same reading-width column as the rest
                of the dashboard. */}
            <div className={styles.wideTable}>
              <DanceEntriesTable entries={entries} competitions={competitions} onEdit={handleEditFromSummary} onDelete={handleDelete} />
            </div>
          </>
        )}
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
