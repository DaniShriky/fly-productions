import Link from "next/link";
import { competitions } from "@/data/competitions";
import { Competition } from "@/types/competition";
import { useAutoScroll } from "@/lib/useAutoScroll";
import CompetitionCard from "@/components/home/CompetitionCard";
import styles from "./MoreCompetitions.module.css";

// Same repeat trick as CompetitionCarousel.tsx — see useAutoScroll.ts for why.
const REPEAT = 3;

export default function MoreCompetitions({ current }: { current: Competition }) {
  const others = competitions.filter((c) => c.slug !== current.slug);
  const scrollRef = useAutoScroll<HTMLDivElement>(45, REPEAT);
  const trackItems = Array.from({ length: REPEAT }, () => others).flat();

  return (
    <section>
      <div className={styles.head}>
        <Link href="/" className={styles.seeAll}>לעמוד הבית</Link>
        <h2 className="en">CHECK MORE COMPETITIONS</h2>
      </div>
      <div ref={scrollRef} className={styles.viewport}>
        <div className={styles.track}>
          {trackItems.map((c, i) => (
            <CompetitionCard key={`${c.slug}-${i}`} competition={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
