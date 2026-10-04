import { useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { updateRegistrationCutoffAdmin } from "@/lib/queries/adminCompetitions";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { formatDateHe } from "@/lib/pricing";
import { getGeneralRegistrationCutoffIso, getHebrewDayOfWeek } from "@/lib/getCompetitionDays";
import { MinusIcon, PlusIcon } from "@/components/dashboard/icons";
import styles from "./RegistrationCutoffEditor.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
};

// Lets an admin nudge a specific competition's general registration cutoff
// forward/back by a day at a time, instead of it always being the fixed
// 45-days-before-the-event default (per Dani, 2026-10-05). Each click saves
// immediately — no separate save button, same immediacy as the payment
// status toggle elsewhere on this page.
export default function RegistrationCutoffEditor({ competitions }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string | null | undefined>>(() =>
    Object.fromEntries(competitions.map((c) => [c.id, c.registrationCutoffOverride]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function shift(competition: CompetitionWithPricing, deltaDays: number) {
    const current = getGeneralRegistrationCutoffIso(competition.date, overrides[competition.id]);
    if (!current) return;

    const next = new Date(current);
    next.setUTCDate(next.getUTCDate() + deltaDays);
    const nextIso = next.toISOString().slice(0, 10);

    setSavingId(competition.id);
    setErrorId(null);
    try {
      await updateRegistrationCutoffAdmin(supabaseBrowserClient, competition.id, nextIso);
      setOverrides((cur) => ({ ...cur, [competition.id]: nextIso }));
    } catch (err) {
      console.error("Failed to update registration cutoff:", err);
      setErrorId(competition.id);
    } finally {
      setSavingId(null);
    }
  }

  async function resetToDefault(competition: CompetitionWithPricing) {
    setSavingId(competition.id);
    setErrorId(null);
    try {
      await updateRegistrationCutoffAdmin(supabaseBrowserClient, competition.id, null);
      setOverrides((cur) => ({ ...cur, [competition.id]: null }));
    } catch (err) {
      console.error("Failed to reset registration cutoff:", err);
      setErrorId(competition.id);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>תחרות</th>
            <th>סיום הרשמה</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {competitions.map((competition) => {
            const override = overrides[competition.id];
            const effectiveIso = getGeneralRegistrationCutoffIso(competition.date, override);
            const isCustom = !!override;
            const saving = savingId === competition.id;

            return (
              <tr key={competition.id}>
                <td>
                  <span className="en" lang="en">
                    {competition.name}
                  </span>
                </td>
                <td>
                  {effectiveIso ? (
                    <>
                      <span className={styles.dayOfWeek}>יום {getHebrewDayOfWeek(effectiveIso)},</span>{" "}
                      <span dir="ltr">{formatDateHe(effectiveIso)}</span>
                      {isCustom && <span className={styles.customBadge}>מותאם אישית</span>}
                    </>
                  ) : (
                    "—"
                  )}
                  {errorId === competition.id && <p className={styles.errorText}>העדכון נכשל - נסו שוב</p>}
                </td>
                <td>
                  <div className={styles.controls}>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepperButton}
                        onClick={() => shift(competition, -1)}
                        disabled={saving || !effectiveIso}
                        aria-label="הקדמת מועד סיום ההרשמה ביום"
                      >
                        <MinusIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.stepperButton}
                        onClick={() => shift(competition, 1)}
                        disabled={saving || !effectiveIso}
                        aria-label="דחיית מועד סיום ההרשמה ביום"
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        className={styles.resetButton}
                        onClick={() => resetToDefault(competition)}
                        disabled={saving}
                      >
                        איפוס לברירת מחדל
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
