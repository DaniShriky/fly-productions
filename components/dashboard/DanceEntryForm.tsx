import { FormEvent, useEffect, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { DanceEntryInput } from "@/lib/queries/registrations";
import { Registration } from "@/types/registration";
import { CATEGORY_LABELS, STEP_DIVISIONS, UiCategory, computePrice, resolveCategory, uiCategoryOf } from "@/lib/pricing";
import styles from "./DanceEntryForm.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  editingEntry: Registration | null;
  onSubmit: (entry: DanceEntryInput, existingId?: string) => Promise<void>;
  onCancelEdit: () => void;
};

const UI_CATEGORIES: { value: UiCategory; label: string }[] = [
  { value: "solo", label: "סולו" },
  { value: "duet", label: "דואט" },
  { value: "trio_quartet", label: "טריו/קוורטט" },
  { value: "group", label: "קבוצה" },
];

export default function DanceEntryForm({ competitions, editingEntry, onSubmit, onCancelEdit }: Props) {
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
  const [danceName, setDanceName] = useState("");
  const [uiCategory, setUiCategory] = useState<UiCategory>("group");
  const [participantCount, setParticipantCount] = useState("1");
  const [stepDivision, setStepDivision] = useState(STEP_DIVISIONS[0]);
  const [danceStyle, setDanceStyle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editingEntry) return;
    setCompetitionId(editingEntry.competitionId);
    setDanceName(editingEntry.danceName);
    setUiCategory(uiCategoryOf(editingEntry.category));
    setParticipantCount(String(editingEntry.participantCount));
    setStepDivision(editingEntry.stepDivision);
    setDanceStyle(editingEntry.danceStyle ?? "");
  }, [editingEntry]);

  const count = Number(participantCount) || 0;
  const resolvedCategory = resolveCategory(uiCategory, count);
  const competition = competitions.find((c) => c.id === competitionId);
  const price = competition ? computePrice(competition.priceTiers, resolvedCategory) : null;

  function resetForm() {
    setDanceName("");
    setUiCategory("group");
    setParticipantCount("1");
    setStepDivision(STEP_DIVISIONS[0]);
    setDanceStyle("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!danceName || count < 1) return;

    setSubmitting(true);
    try {
      await onSubmit(
        {
          competitionId,
          danceName,
          category: resolvedCategory,
          participantCount: count,
          stepDivision,
          danceStyle,
        },
        editingEntry?.id
      );
      resetForm();
      onCancelEdit();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>{editingEntry ? "עריכת ריקוד" : "הוספת ריקוד"}</h3>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>תחרות</span>
          <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>שם הריקוד</span>
          <input required value={danceName} onChange={(e) => setDanceName(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>קטגוריה</span>
          <select value={uiCategory} onChange={(e) => setUiCategory(e.target.value as UiCategory)}>
            {UI_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>מספר משתתפים</span>
          <input
            type="number"
            min={1}
            required
            value={participantCount}
            onChange={(e) => setParticipantCount(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>חלוקת גיל (STEP)</span>
          <select value={stepDivision} onChange={(e) => setStepDivision(e.target.value)}>
            {STEP_DIVISIONS.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>סגנון ריקוד (לא חובה)</span>
          <input value={danceStyle} onChange={(e) => setDanceStyle(e.target.value)} />
        </label>
      </div>

      <div className={styles.footer}>
        <p className={styles.priceLine}>
          קטגוריה לתמחור: {CATEGORY_LABELS[resolvedCategory]}
          {price != null && (
            <>
              {" "}
              · מחיר: <span className={styles.price}>{price}₪</span> למשתתף/ת
            </>
          )}
        </p>
        <div className={styles.actions}>
          {editingEntry && (
            <button type="button" className={styles.cancelButton} onClick={onCancelEdit}>
              ביטול עריכה
            </button>
          )}
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "שולחת..." : editingEntry ? "שמירת שינויים" : "הוספה"}
          </button>
        </div>
      </div>
    </form>
  );
}
