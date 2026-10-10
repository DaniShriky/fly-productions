import { CSSProperties, useState } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { updateEarlyRegistrationCutoffAdmin, updateRegistrationCutoffAdmin } from "@/lib/queries/adminCompetitions";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { formatDateHe } from "@/lib/pricing";
import { getGeneralRegistrationCutoffIso, getHebrewDayOfWeek } from "@/lib/getCompetitionDays";
import { hexToRgbParts } from "@/lib/hexToRgbParts";
import { MinusIcon, PlusIcon } from "@/components/dashboard/icons";
import styles from "./RegistrationCutoffEditor.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
};

// Religious competitions get this pink override in this table specifically
// (per Dani, 2026-10-06) — see the longer comment on rowStyle below.
const RELIGIOUS_ROW_COLOR = "#f582c2";

// Per-slug color overrides, local to this admin table only — per Dani,
// 2026-10-06: star-of-the-dance's accentColor (lib/competitionAccentColors.ts)
// changed to blue for the studio manager's registration flow (DanceEntryForm's
// glow, DanceEntriesTable, CompetitionDanceList, RegistrationNotice), but
// should keep showing its original red specifically here, in the admin's
// cutoff table.
const ADMIN_ROW_COLOR_OVERRIDES: Record<string, string> = {
  "star-of-the-dance": "#f0615f",
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
  // Per Dani, 2026-10-10: the early-pricing cutoff (price_tiers.early_until)
  // belongs in this same table, editable the same way as the general
  // cutoff — separate state since it's a different underlying column.
  const [earlyUntils, setEarlyUntils] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(competitions.map((c) => [c.id, c.priceTiers?.earlyUntil]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  // Separate from savingId/errorId above — sharing them would make a
  // failure in one column wrongly show the error text under the other
  // column too, for the same row.
  const [earlySavingId, setEarlySavingId] = useState<string | null>(null);
  const [earlyErrorId, setEarlyErrorId] = useState<string | null>(null);

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

  async function shiftEarlyUntil(competition: CompetitionWithPricing, deltaDays: number) {
    const current = earlyUntils[competition.id];
    if (!current) return;

    const next = new Date(`${current}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + deltaDays);
    const nextIso = next.toISOString().slice(0, 10);

    setEarlySavingId(competition.id);
    setEarlyErrorId(null);
    try {
      await updateEarlyRegistrationCutoffAdmin(supabaseBrowserClient, competition.id, nextIso);
      setEarlyUntils((cur) => ({ ...cur, [competition.id]: nextIso }));
    } catch (err) {
      console.error("Failed to update early-registration cutoff:", err);
      setEarlyErrorId(competition.id);
    } finally {
      setEarlySavingId(null);
    }
  }

  // Per Dani, 2026-10-06: each competition's row gets its own accent color
  // (same hand-picked COMPETITION_ACCENT_COLORS used on the dance-entry
  // form/saved-dances list — see lib/competitionAccentColors.ts) so rows are
  // easy to tell apart at a glance, not just by reading the name. A leading
  // (right, in this RTL table) colored bar plus a faint background tint —
  // same rgba-from-hex-parts technique as DanceEntryForm's glow, since
  // CSS color-mix() isn't supported everywhere.
  //
  // Religious competitions get RELIGIOUS_ROW_COLOR here specifically —
  // mega-star-religious otherwise shares mega-star's plain gold accentColor,
  // so the two were indistinguishable in this table even though they're
  // different competitions. This is a local override just for this admin
  // table, not a change to COMPETITION_ACCENT_COLORS itself (that color is
  // still what mega-star-religious's own hero/branding use).
  function rowStyle(competition: CompetitionWithPricing): CSSProperties | undefined {
    const color = competition.isReligious
      ? RELIGIOUS_ROW_COLOR
      : ADMIN_ROW_COLOR_OVERRIDES[competition.slug] ?? competition.accentColor;
    const rgb = color ? hexToRgbParts(color) : null;
    if (!rgb) return undefined;
    return {
      // Physical borderRight, not a logical borderInlineStart — this RTL
      // layout has a documented bug with logical inline properties
      // misbehaving (see CLAUDE.md), so this codebase sticks to physical
      // properties throughout.
      borderRight: `3px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
    };
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
            <th>סיום הרשמה מוקדמת</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {competitions.map((competition) => {
            const override = overrides[competition.id];
            const effectiveIso = getGeneralRegistrationCutoffIso(competition.date, override);
            const isCustom = !!override;
            const saving = savingId === competition.id;
            const earlyUntilIso = earlyUntils[competition.id];
            const earlySaving = earlySavingId === competition.id;

            return (
              <tr key={competition.id} style={rowStyle(competition)}>
                <td>
                  <span className={styles.nameCell}>
                    {competition.logo && (
                      <span className={styles.logoSlot}>
                        <Image src={competition.logo} alt="" width={32} height={28} className={styles.logo} />
                      </span>
                    )}
                    <span className="en" lang="en">
                      {competition.name}
                    </span>
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
                <td>
                  {earlyUntilIso ? (
                    <>
                      <span className={styles.dayOfWeek}>יום {getHebrewDayOfWeek(earlyUntilIso)},</span>{" "}
                      <span dir="ltr">{formatDateHe(earlyUntilIso)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                  {earlyErrorId === competition.id && <p className={styles.errorText}>העדכון נכשל - נסו שוב</p>}
                </td>
                <td>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => shiftEarlyUntil(competition, -1)}
                      disabled={earlySaving || !earlyUntilIso}
                      aria-label="הקדמת מועד סיום ההרשמה המוקדמת ביום"
                    >
                      <MinusIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.stepperButton}
                      onClick={() => shiftEarlyUntil(competition, 1)}
                      disabled={earlySaving || !earlyUntilIso}
                      aria-label="דחיית מועד סיום ההרשמה המוקדמת ביום"
                    >
                      <PlusIcon size={14} />
                    </button>
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
