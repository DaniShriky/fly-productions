import { useEffect, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { DanceEntryInput } from "@/lib/queries/registrations";
import { Registration } from "@/types/registration";
import StepHeader from "./StepHeader";
import CompetitionPicker from "./CompetitionPicker";
import RegistrationNotice from "./RegistrationNotice";
import CompetitionDanceList from "./CompetitionDanceList";
import DanceEntryForm from "./DanceEntryForm";
import styles from "./Step2FinalRegistration.module.css";

type Props = {
  studioManagerId: string;
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
  competitions,
  entries,
  onSubmit,
  onDelete,
  initialEditEntry,
  onInitialEditConsumed,
}: Props) {
  function hasEntriesFor(competitionId: string) {
    return entries.some((e) => e.competitionId === competitionId);
  }

  const [selectedCompetitionId, setSelectedCompetitionId] = useState(
    initialEditEntry?.competitionId ?? competitions[0]?.id ?? ""
  );
  const [mode, setMode] = useState<"list" | "form">(() => {
    if (initialEditEntry) return "form";
    return hasEntriesFor(selectedCompetitionId) ? "list" : "form";
  });
  const [editingEntry, setEditingEntry] = useState<Registration | null>(initialEditEntry ?? null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on
  // mount only, to hand the "consumed" flag back to the dashboard page.
  useEffect(() => {
    if (initialEditEntry) onInitialEditConsumed?.();
  }, []);

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

  return (
    <section className={styles.section}>
      <StepHeader
        kicker="שלב 2"
        title="הוספת ריקודים"
        hint='כשיש לך מספרים סופיים לכל ריקוד — בחרי תחרות והוסיפי אליה את הריקודים. השליחה עדיין אינה תשלום, וההרשמה תיחשב סופית רק לאחר תשלום בפועל בשלב 3.'
      />

      <CompetitionPicker
        competitions={competitions}
        selectedId={selectedCompetitionId}
        onSelect={(id) => {
          setSelectedCompetitionId(id);
          setEditingEntry(null);
          setMode(hasEntriesFor(id) ? "list" : "form");
        }}
        notice={competition && <RegistrationNotice competition={competition} />}
      />

      {!competition ? null : mode === "form" ? (
        <DanceEntryForm
          studioManagerId={studioManagerId}
          competition={competition}
          entries={entries}
          editingEntry={editingEntry}
          onSubmit={onSubmit}
          onClose={closeForm}
        />
      ) : (
        <CompetitionDanceList
          competition={competition}
          allEntries={entries}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
