import type { ReactNode } from "react";
import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { CheckIcon } from "./icons";
import styles from "./CompetitionPicker.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  selectedId: string;
  onSelect: (id: string) => void;
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
export default function CompetitionPicker({ competitions, selectedId, onSelect, notice }: Props) {
  return (
    <div>
      <p className={styles.groupTitle}>בחירת תחרות</p>
      {notice}
      <div className={styles.grid}>
        {competitions.map((c) => {
          const active = c.id === selectedId;
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
              {c.logo && <Image src={c.logo} alt="" width={44} height={38} className={styles.logo} />}
              <span className={`${styles.name} en`} lang="en">
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
