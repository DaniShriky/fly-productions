import { useState } from "react";
import { competitions } from "@/data/competitions";
import { Competition } from "@/types/competition";
import { useAutoScroll } from "@/lib/useAutoScroll";
import CompetitionCard from "@/components/home/CompetitionCard";
import styles from "./MoreCompetitions.module.css";

// Same repeat trick as CompetitionCarousel.tsx — see useAutoScroll.ts for why.
const REPEAT = 3;

export default function MoreCompetitions({ current }: { current: Competition }) {
  const others = competitions.filter((c) => c.slug !== current.slug);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useAutoScroll<HTMLDivElement>(45, REPEAT, expanded);

  const trackItems = expanded ? others : Array.from({ length: REPEAT }, () => others).flat();

  return (
    <section>
      <div className={styles.head}>
        <button type="button" className={styles.seeAll} onClick={() => setExpanded((e) => !e)}>
          {expanded ? "הצגה מצומצמת" : `צפייה בכל ${others.length} התחרויות`}
        </button>
        <h2 className="en">CHECK MORE COMPETITIONS</h2>
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
