import { useEffect, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { DanceEntryInput } from "@/lib/queries/registrations";
import { Registration } from "@/types/registration";
import { StudioManager } from "@/types/studioManager";
import StepHeader from "./StepHeader";
import CompetitionPicker from "./CompetitionPicker";
import RegistrationNotice from "./RegistrationNotice";
import CompetitionDanceList from "./CompetitionDanceList";
import DanceEntryForm from "./DanceEntryForm";
import { ArrowForwardIcon } from "./icons";
import styles from "./Step2FinalRegistration.module.css";

type Props = {
  studioManagerId: string;
  manager: StudioManager;
  competitions: CompetitionWithPricing[];
  entries: Registration[];
  onSubmit: (entry: DanceEntryInput, existingId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  // Set when a manager clicked "edit" on a dance from step 3's summary table
  // instead of getting here through the competition picker — opens straight
  // into that dance's edit form instead of dropping her on the list with no
  // context. Consumed once on mount (this component remounts fresh every
  // time step 2 becomes active, since the dashboard page only renders it
  // while activeStep === 2).
  initialEditEntry?: Registration | null;
  onInitialEditConsumed?: () => void;
  // A clear, guided way to move on — Dani specifically asked for this so a
  // manager doesn't have to notice/understand RegistrationStepper's tabs are
  // clickable navigation on their own.
  onNext: () => void;
  // Mirrors whether DanceEntryForm currently holds unsaved data (see its own
  // onDirtyChange) up to the dashboard page, which needs it too — the top
  // RegistrationStepper's tabs are a second way to navigate off step 1 that
  // this component doesn't control directly.
  onDirtyChange?: (dirty: boolean) => void;
};

// Orchestrates step 2: pick a competition, see (and manage) only that
// competition's dances, and add/edit one at a time through DanceEntryForm.
// The whole point of this step is adding dances, so the form opens by
// itself the moment a competition has none yet — no extra click just to
// start. Once she's added at least one, it switches to the list (with an
// "add another" button) so a returning manager with 15-20 dances already in
// doesn't have to scroll past the long form just to see what she has.
export default function Step2FinalRegistration({
  studioManagerId,
  manager,
  competitions,
  entries,
  onSubmit,
  onDelete,
  initialEditEntry,
  onInitialEditConsumed,
  onNext,
  onDirtyChange,
}: Props) {
  // Per Dani, 2026-10-07: this step is about the current round being built
  // right now — a dance that's already been submitted shouldn't still show
  // up here (the picker's "X ריקודים רשומים" count, or the list below it),
  // the same way it was already dropped from step 2's own summary table.
  // DanceEntryForm below still gets the full, unfiltered `entries` — its
  // choreographer/dancer-name suggestions and duplicate-name checks are
  // meant to look across everything, not just this round.
  const currentRoundEntries = entries.filter((e) => !e.submittedAt);

  function hasEntriesFor(competitionId: string) {
    return currentRoundEntries.some((e) => e.competitionId === competitionId);
  }

  // Only affects which competitions are offered as *new* picks — never
  // narrows the full `competitions` list used below for looking up a
  // competition's own details, so an existing dance from before her
  // preference changed (or was set by an admin exception) still opens and
  // edits correctly either way. Falls back to secular the same way
  // ProfileEditForm already does when no preference is set yet. A manager
  // who wants both sectors (per Dani, 2026-10-07) sees every competition,
  // unfiltered.
  const pickableCompetitions =
    manager.preferredCompetitionType === "שניהם"
      ? competitions
      : competitions.filter((c) => (manager.preferredCompetitionType === "מגזר דתי" ? c.isReligious : !c.isReligious));

  const [selectedCompetitionId, setSelectedCompetitionId] = useState(
    initialEditEntry?.competitionId ?? pickableCompetitions[0]?.id ?? ""
  );
  const [mode, setMode] = useState<"list" | "form">(() => {
    if (initialEditEntry) return "form";
    return hasEntriesFor(selectedCompetitionId) ? "list" : "form";
  });
  const [editingEntry, setEditingEntry] = useState<Registration | null>(initialEditEntry ?? null);
  // Only DanceEntryForm's own report matters while it's actually mounted and
  // showing — gating on `mode` means a stale `true` left over from just
  // before it closed (save/cancel) can't wrongly keep blocking navigation.
  const [formReportsUnsaved, setFormReportsUnsaved] = useState(false);
  const hasUnsavedChanges = mode === "form" && formReportsUnsaved;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on
  // mount only, to hand the "consumed" flag back to the dashboard page.
  useEffect(() => {
    if (initialEditEntry) onInitialEditConsumed?.();
  }, []);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const competition = competitions.find((c) => c.id === selectedCompetitionId);

  function openAdd() {
    setEditingEntry(null);
    setMode("form");
  }

  function openEdit(entry: Registration) {
    setEditingEntry(entry);
    setMode("form");
  }

  function closeForm() {
    setEditingEntry(null);
    setMode("list");
  }

  async function handleDelete(id: string) {
    await onDelete(id);
    if (editingEntry?.id === id) closeForm();
  }

  // Moving to step 2 unmounts this whole component, silently wiping any
  // unsaved dance (per Dani, 2026-10-03) — same confirm used for the top
  // RegistrationStepper's own tabs (see onDirtyChange/pages/dashboard/index.tsx),
  // since this button is a second way off step 1 that needs the same guard.
  function handleNextClick() {
    if (hasUnsavedChanges && !confirm("יש לכם ריקוד שמילאתם שעדיין לא נשמר. לעזוב בכל זאת?")) return;
    onNext();
  }

  // Switching to a different competition resets mode/editingEntry for the
  // one you're leaving, discarding an unsaved dance the same way the step
  // navigation above does (per Dani, 2026-10-03) — same guard, same message.
  // Re-selecting the already-active competition is a no-op either way, so
  // it's excluded rather than prompting pointlessly.
  function handleCompetitionSelect(id: string) {
    if (id !== selectedCompetitionId && hasUnsavedChanges) {
      if (!confirm("יש לכם ריקוד שמילאתם שעדיין לא נשמר. לעזוב בכל זאת?")) return;
    }
    setSelectedCompetitionId(id);
    setEditingEntry(null);
    setMode(hasEntriesFor(id) ? "list" : "form");
  }

  return (
    <section className={styles.section}>
      <StepHeader kicker="שלב 1" title="הוספת ריקודים לתחרות" />

      <CompetitionPicker
        competitions={pickableCompetitions}
        selectedId={selectedCompetitionId}
        onSelect={handleCompetitionSelect}
        entries={currentRoundEntries}
        notice={competition && <RegistrationNotice competition={competition} />}
      />

      {!competition ? null : mode === "form" ? (
        // key={competition.id}: switching to another competition that ALSO
        // has zero entries keeps `mode` at "form" the whole time, so without
        // this DanceEntryForm never actually unmounts — its state (and any
        // stale unsaved fields from the competition she just left) would
        // just carry over silently instead of starting blank, which is both
        // visually wrong and what was still tripping the unsaved-changes
        // warning one switch later even though nothing had been typed for
        // the new competition (per Dani, 2026-10-03).
        <DanceEntryForm
          key={competition.id}
          studioManagerId={studioManagerId}
          manager={manager}
          competition={competition}
          entries={entries}
          editingEntry={editingEntry}
          onSubmit={onSubmit}
          onClose={closeForm}
          onDirtyChange={setFormReportsUnsaved}
        />
      ) : (
        <CompetitionDanceList
          competition={competition}
          allEntries={currentRoundEntries}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <div className={styles.nextStepRow}>
        <button type="button" className={styles.nextStepButton} onClick={handleNextClick}>
          שלב הבא: סיכום הזמנה
          <ArrowForwardIcon size={15} />
        </button>
      </div>
    </section>
  );
}
