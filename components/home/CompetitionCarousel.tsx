import { useState } from "react";
import { Competition } from "@/types/competition";
import { useAutoScroll } from "@/lib/useAutoScroll";
import CompetitionCard from "./CompetitionCard";
import styles from "./CompetitionCarousel.module.css";

// How many times the full competitions array is rendered back-to-back.
// This replaces the "clone until it overflows" trick from the HTML
// prototype — in React it's simpler to just render more copies in JSX.
// 2x is still comfortably wide enough to overflow any realistic screen
// width for seamless looping (7 cards at even the narrowest ~180px width
// already exceeds any phone viewport on its own) — dropped from 3x since
// each repeat is 2 full-size images (thumb + logo) per card, and this is
// the single biggest chunk of what the homepage has to load/decode at
// once on mobile. Raise it if you add very few competitions in the future
// and it stops overflowing.
const REPEAT = 2;

export default function CompetitionCarousel({ competitions }: { competitions: Competition[] }) {
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
        <h2>התחרויות שלנו</h2>
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
