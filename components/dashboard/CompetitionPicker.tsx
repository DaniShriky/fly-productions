import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import { isRegistrationTemporarilyClosed } from "@/lib/closedCompetitions";
import { CheckIcon } from "./icons";
import styles from "./CompetitionPicker.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  selectedId: string;
  onSelect: (id: string) => void;
  // All of this manager's dance entries across every competition (not just
  // the selected one) — used only to count how many already belong to each
  // card, so she can see at a glance which competitions she's already
  // started on before picking one.
  entries: Registration[];
  // Rendered between the "בחירת תחרות" label and the card grid — the
  // selected competition's pricing/deadline notice belongs right there
  // (Dani specifically asked for it above the cards, not below them), but
  // this component stays generic and doesn't know about RegistrationNotice
  // itself; the caller supplies it.
  notice?: ReactNode;
};

// A dance always belongs to exactly one competition (see
// types/registration.ts), so this is single-select — it just picks which
// competition's dance list/form is showing below, the same job the old
// pill-shaped tabs inside DanceEntryForm did. Redesigned as a card grid so it
// reads clearly even once there are 5+ competitions to choose from.
export default function CompetitionPicker({ competitions, selectedId, onSelect, entries, notice }: Props) {
  // Per Dani, 2026-10-07: Eilat's competitions aren't open for registration
  // yet — the cards below gray them out and ignore clicks instead, and this
  // is the friendly fallback message for that click (auto-dismisses).
  const [closedNotice, setClosedNotice] = useState(false);

  useEffect(() => {
    if (!closedNotice) return;
    const timer = setTimeout(() => setClosedNotice(false), 4500);
    return () => clearTimeout(timer);
  }, [closedNotice]);

  return (
    <div>
      <p className={styles.groupTitle}>בחירת תחרות</p>
      {notice}
      {closedNotice && (
        <p className={styles.closedNotice}>ההרשמה לתחרות הזו עוד לא נפתחה - תיפתח בקרוב! 💃</p>
      )}
      <div className={styles.grid}>
        {competitions.map((c) => {
          const active = c.id === selectedId;
          const closed = isRegistrationTemporarilyClosed(c.slug);
          const danceCount = entries.filter((e) => e.competitionId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.card} ${active ? styles.cardActive : ""} ${closed ? styles.cardClosed : ""}`}
              onClick={() => {
                if (closed) {
                  setClosedNotice(true);
                  return;
                }
                // Per Dani, 2026-10-08: picking an open competition while
                // the closed-competition notice is still showing (from a
                // previous click) used to leave it hanging until its own
                // 4.5s timer ran out, instead of disappearing right away
                // once it's no longer relevant.
                setClosedNotice(false);
                onSelect(c.id);
              }}
              aria-pressed={active}
              aria-disabled={closed}
            >
              {active && (
                <span className={styles.check}>
                  <CheckIcon size={13} />
                </span>
              )}
              {closed && <span className={styles.comingSoonBadge}>בקרוב</span>}
              {/* Fixed-height slot regardless of whether this competition has
                  a logo yet (not every one does) — otherwise a card without
                  one would be shorter than its neighbors, per Dani,
                  2026-10-03 ("more organized/consistent"). */}
              <span className={styles.logoSlot}>
                {c.logo && <Image src={c.logo} alt="" width={44} height={38} className={styles.logo} />}
              </span>
              <span className={`${styles.name} en`} lang="en">
                {c.name}
              </span>
              <span className={styles.date} dir="ltr" lang="en">
                {getCompetitionDateLabel(c.date)}
              </span>
              {/* Always takes up its row's space so every card ends at the
                  same height — only its content is conditional (an empty,
                  invisible badge for a competition with no dances yet reads
                  as cleaner than that card simply being shorter). */}
              {!closed && (
                <span className={styles.danceCount} style={danceCount === 0 ? { visibility: "hidden" } : undefined}>
                  {danceCount} {danceCount === 1 ? "ריקוד רשום" : "ריקודים רשומים"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
