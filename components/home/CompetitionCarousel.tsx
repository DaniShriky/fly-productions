import { useState } from "react";
import { competitions } from "@/data/competitions";
import { useAutoScroll } from "@/lib/useAutoScroll";
import CompetitionCard from "./CompetitionCard";
import styles from "./CompetitionCarousel.module.css";

// How many times the full competitions array is rendered back-to-back.
// This replaces the "clone until it overflows" trick from the HTML
// prototype — in React it's simpler to just render more copies in JSX.
// 3x is comfortably wide enough for very large desktop monitors; raise it
// if you add very few competitions in the future and it stops overflowing.
const REPEAT = 3;

export default function CompetitionCarousel() {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useAutoScroll<HTMLDivElement>(45, REPEAT, expanded);

  const trackItems = expanded
    ? competitions
    : Array.from({ length: REPEAT }, () => competitions).flat();

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <button className={styles.seeAll} onClick={() => setExpanded((e) => !e)}>
          {expanded ? "הצגה מצומצמת" : `צפייה בכל ${competitions.length} התחרויות`}
        </button>
        <h2 className="en">OUR COMPETITIONS</h2>
      </div>

      <div
        ref={scrollRef}
        className={`${styles.viewport} ${expanded ? styles.expanded : ""}`}
      >
        <div className={styles.track}>
          {trackItems.map((c, i) => (
            <CompetitionCard key={`${c.slug}-${i}`} competition={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
