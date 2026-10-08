import { useCallback, useEffect, useState } from "react";
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
import SubmissionStep from "@/components/dashboard/SubmissionStep";
import LiveNotifications from "@/components/dashboard/LiveNotifications";
import { ArrowForwardIcon } from "@/components/dashboard/icons";
import { requireApprovedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import {
  DanceEntryInput,
  deleteDanceEntry,
  getOwnRegistrations,
  removeSongForRegistration,
  submitRegistrations,
  uploadDanceMusic,
  uploadSongForRegistration,
  upsertDanceEntry,
} from "@/lib/queries/registrations";
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

export default function Dashboard({ competitions, registrations, manager: initialManager }: Props) {
  const [manager, setManager] = useState(initialManager);
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
      if (!confirm("יש לכם ריקוד שמילאתם שעדיין לא נשמר. לעזוב בכל זאת?")) return;
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

  // Per Dani, 2026-10-06: music can still be uploaded up to 10 days before
  // the event, even once the dance itself is locked by submission — see
  // uploadSongForRegistration/manager_upload_song in supabase/schema.sql.
  // Takes the raw File (not a path) since the storage upload itself needs
  // manager.id for the path prefix, which DanceEntriesTable doesn't
  // otherwise need to know.
  async function handleSongUpload(id: string, file: File, durationSeconds: number) {
    const path = await uploadDanceMusic(supabaseBrowserClient, manager.id, file);
    await uploadSongForRegistration(supabaseBrowserClient, id, path, durationSeconds);
    setEntries((current) =>
      current.map((e) => (e.id === id ? { ...e, songFilePath: path, songDurationSeconds: Math.round(durationSeconds) } : e))
    );
  }

  // Per Dani, 2026-10-07: the counterpart to handleSongUpload above — same
  // unpaid-only gate (manager_remove_song in supabase/schema.sql), and
  // actually deletes the Storage object too (removeSongForRegistration's
  // own job), not just the registration's reference to it.
  async function handleSongRemove(id: string, songFilePath: string) {
    await removeSongForRegistration(supabaseBrowserClient, id, songFilePath);
    setEntries((current) =>
      current.map((e) => (e.id === id ? { ...e, songFilePath: undefined, songDurationSeconds: undefined } : e))
    );
  }

  // Mirrors exactly what submit_registrations() does server-side (see
  // supabase/schema.sql) — every currently-draft, unpaid entry becomes
  // submitted — so the UI reflects the lock/visibility change immediately
  // without a round-trip refetch.
  async function handleSubmitRegistrations(
    acceptedTerms: boolean,
    mediaConsent: "consented" | "declined",
    totalParticipantCount: number,
    isSabbathObservant: boolean | null
  ) {
    await submitRegistrations(
      supabaseBrowserClient,
      acceptedTerms,
      mediaConsent,
      totalParticipantCount,
      isSabbathObservant
    );
    const now = new Date().toISOString();
    setEntries((current) =>
      current.map((e) => (!e.submittedAt && e.paymentStatus === "unpaid" ? { ...e, submittedAt: now } : e))
    );
  }

  // Stable across renders (useCallback, no deps) so LiveNotifications' own
  // realtime subscription doesn't tear down and reconnect every time this
  // page re-renders — see its effect's comment. Keeps her own table in sync
  // the moment an admin changes payment status/exception, not just the
  // popup notification.
  const handleRegistrationUpdated = useCallback(
    (update: { id: string; paymentStatus: "unpaid" | "paid"; latePaymentException: boolean }) => {
      setEntries((current) =>
        current.map((e) =>
          e.id === update.id
            ? { ...e, paymentStatus: update.paymentStatus, latePaymentException: update.latePaymentException }
            : e
        )
      );
    },
    []
  );

  // Stable for the same reason as handleRegistrationUpdated above — per
  // Dani, 2026-10-03: the toast for a competition-type decision was showing
  // while the actual data behind it (CompetitionPicker's filter in
  // Step2FinalRegistration, and /profile's own radio/approval-note display)
  // still reflected the pre-approval state until a manual refresh.
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
        <title>הרשמה לתחרויות - FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <LiveNotifications
        managerId={manager.id}
        onRegistrationUpdated={handleRegistrationUpdated}
        onManagerUpdated={handleManagerUpdated}
      />

      <ReservationNotice manager={manager} />

      <DashboardBanner />

      {/* Outside .stickyHeader on purpose (per Dani, 2026-10-06) — this
          scrolls away with the normal page flow instead of being toggled by
          JS, so there's no layout jump. Only RegistrationStepper itself
          stays pinned once scrolled past. */}
      <header className={styles.pageHeader}>
        <p className={styles.pageSubtitle}>כאן תוכלו לעקוב אחרי ההרשמה שלכם ולנהל את הריקודים לתחרויות.</p>
      </header>

      <div className={styles.stickyHeader} style={{ top: navHeight }}>
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

        {activeStep === 2 && (() => {
          // Per Dani, 2026-10-07: step 2 is a summary of the current order
          // being built right now, not a running history — once a dance is
          // submitted it drops out of this live view entirely (it's still
          // visible afterward on the dedicated /dashboard/history page).
          // Filtering here (not just inside DanceEntriesTable) keeps
          // PaymentStatusCard's own count consistent with the table below
          // it, rather than showing a total that includes dances the table
          // itself no longer lists.
          const currentOrderEntries = entries.filter((e) => !e.submittedAt);

          return (
            <>
              <div className={styles.narrow}>
                {/* Column on mobile (unchanged), row on desktop — Dani asked
                    for these two to sit side by side once there's room. */}
                <div className={styles.stepHeaderRow}>
                  <StepHeader
                    kicker="שלב 2"
                    title="סיכום הזמנה"
                    hint='לפני התשלום, בדקו שכל פרטי הריקודים שהוספתם נכונים.'
                    onBack={() => setActiveStep(1)}
                    backTo={1}
                  />
                  <PaymentStatusCard entries={currentOrderEntries} />
                </div>
              </div>

              {/* Outside .narrow deliberately — the entries table has a lot
                  of columns to show, so it uses the full page width instead
                  of being squeezed into the same reading-width column as the
                  rest of the dashboard. */}
              <div className={styles.wideTable}>
                {/* "סטטוס תשלום" is hidden here too, since every row shown
                    is unpaid/unsubmitted by definition; "סטטוס הגשה" stays,
                    since that's where the edit/delete buttons live. */}
                <DanceEntriesTable
                  entries={currentOrderEntries}
                  competitions={competitions}
                  onEdit={handleEditFromSummary}
                  onDelete={handleDelete}
                  onSongUpload={handleSongUpload}
                  onSongRemove={handleSongRemove}
                  showPaymentColumn={false}
                />
              </div>

              <div className={styles.narrow}>
                <div className={styles.nextStepRow}>
                  <button type="button" className={styles.nextStepButton} onClick={() => setActiveStep(3)}>
                    שלב הבא: אישורים והגשה
                    <ArrowForwardIcon size={15} />
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {activeStep === 3 && (
          <div className={styles.narrow}>
            <StepHeader kicker="שלב 3" title="אישורים והגשה" onBack={() => setActiveStep(2)} backTo={2} />
            <SubmissionStep entries={entries} competitions={competitions} onSubmit={handleSubmitRegistrations} />
          </div>
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
