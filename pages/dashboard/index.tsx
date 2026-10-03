import { useEffect, useState } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import DashboardBanner from "@/components/dashboard/DashboardBanner";
import RegistrationStepper, { RegistrationStep } from "@/components/dashboard/RegistrationStepper";
import ReservationNotice from "@/components/dashboard/ReservationNotice";
import Step2FinalRegistration from "@/components/dashboard/Step2FinalRegistration";
import StepHeader from "@/components/dashboard/StepHeader";
import PaymentStatusCard from "@/components/dashboard/PaymentStatusCard";
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
  const [activeStep, setActiveStep] = useState<RegistrationStep>(1);
  const [pendingEditEntry, setPendingEditEntry] = useState<Registration | null>(null);
  // Whether step 1 currently has an unsaved dance in progress (reported live
  // by Step2FinalRegistration/DanceEntryForm) — switching steps unmounts
  // step 1 entirely, silently discarding that data, so the stepper tabs
  // below need to confirm before actually navigating away from it.
  const [step1Dirty, setStep1Dirty] = useState(false);

  function handleStepSelect(step: RegistrationStep) {
    if (activeStep === 1 && step !== 1 && step1Dirty) {
      if (!confirm("יש לך ריקוד שמילאת שעדיין לא נשמר. לעזוב בכל זאת?")) return;
    }
    setActiveStep(step);
  }

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
    setActiveStep(1);
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

      <ReservationNotice manager={manager} />

      <DashboardBanner />

      <div className={styles.stickyHeader} style={{ top: navHeight }}>
        <header className={styles.pageHeader}>
          <p className={styles.pageSubtitle}>כאן תוכלי לעקוב אחרי ההרשמה שלך ולנהל את הריקודים לתחרויות.</p>
        </header>

        <RegistrationStepper active={activeStep} onSelect={handleStepSelect} />
      </div>

      <main className={styles.main}>
        {activeStep === 1 && (
          <div className={styles.narrow}>
            <Step2FinalRegistration
              studioManagerId={manager.id}
              manager={manager}
              competitions={competitions}
              entries={entries}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              initialEditEntry={pendingEditEntry}
              onInitialEditConsumed={() => setPendingEditEntry(null)}
              onNext={() => setActiveStep(2)}
              onDirtyChange={setStep1Dirty}
            />
          </div>
        )}

        {activeStep === 2 && (
          <>
            <div className={styles.narrow}>
              {/* Column on mobile (unchanged), row on desktop — Dani asked
                  for these two to sit side by side once there's room. */}
              <div className={styles.stepHeaderRow}>
                <StepHeader
                  kicker="שלב 2"
                  title="סיכום ותשלום"
                  hint='לפני התשלום, בדקו שכל פרטי הריקודים שהוספתם נכונים.'
                  onBack={() => setActiveStep(1)}
                />
                <PaymentStatusCard entries={entries} />
              </div>
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
