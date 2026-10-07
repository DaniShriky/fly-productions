import Image from "next/image";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { Registration } from "@/types/registration";
import { CheckIcon } from "./icons";
import styles from "./HistoryCompetitionFilter.module.css";

type Props = {
  competitions: CompetitionWithPricing[];
  entries: Registration[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
};

// Filters /dashboard/history's table by competition — per Dani, 2026-10-07.
// Unlike CompetitionPicker (step 1's "which competition am I adding a new
// dance to" picker, which shows every pickable competition whether she has
// dances there yet or not), this only shows competitions she actually has
// history for — nothing to pick for an empty one — plus a leading "הכל"
// card that resets the filter. Picking a card doesn't navigate anywhere,
// it just narrows the table below.
export default function HistoryCompetitionFilter({ competitions, entries, selectedId, onSelect }: Props) {
  const cards = competitions
    .map((competition) => ({
      competition,
      count: entries.filter((e) => e.competitionId === competition.id).length,
    }))
    .filter(({ count }) => count > 0);

  if (cards.length === 0) return null;

  return (
    <div>
      <p className={styles.groupTitle}>סינון לפי תחרות</p>
      <div className={styles.grid}>
        <button
          type="button"
          className={`${styles.card} ${selectedId === "all" ? styles.cardActive : ""}`}
          onClick={() => onSelect("all")}
          aria-pressed={selectedId === "all"}
        >
          {selectedId === "all" && (
            <span className={styles.check}>
              <CheckIcon size={13} />
            </span>
          )}
          <span className={styles.logoSlot}>
            <Image src="/images/fly-logo.png" alt="" width={32} height={32} className={styles.logo} />
          </span>
          <span className={styles.name}>כל תחרויות המחול</span>
          <span className={styles.danceCount}>
            {entries.length} {entries.length === 1 ? "ריקוד" : "ריקודים"}
          </span>
        </button>

        {cards.map(({ competition, count }) => {
          const active = selectedId === competition.id;
          return (
            <button
              key={competition.id}
              type="button"
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              onClick={() => onSelect(competition.id)}
              aria-pressed={active}
            >
              {active && (
                <span className={styles.check}>
                  <CheckIcon size={13} />
                </span>
              )}
              <span className={styles.logoSlot}>
                {competition.logo && (
                  <Image src={competition.logo} alt="" width={44} height={38} className={styles.logo} />
                )}
              </span>
              <span className={`${styles.name} en`} lang="en">
                {competition.name}
              </span>
              <span className={styles.danceCount}>
                {count} {count === 1 ? "ריקוד" : "ריקודים"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
