import type { ReactNode } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
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
  return (
    <div>
      <p className={styles.groupTitle}>בחירת תחרות</p>
      {notice}
      <div className={styles.grid}>
        {competitions.map((c) => {
          const active = c.id === selectedId;
          const danceCount = entries.filter((e) => e.competitionId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              onClick={() => onSelect(c.id)}
              aria-pressed={active}
            >
              {active && (
                <span className={styles.check}>
                  <CheckIcon size={13} />
                </span>
              )}
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
              <span className={styles.danceCount} style={danceCount === 0 ? { visibility: "hidden" } : undefined}>
                {danceCount} {danceCount === 1 ? "ריקוד רשום" : "ריקודים רשומים"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
