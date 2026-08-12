import Link from "next/link";
import { competitions } from "@/data/competitions";
import { Competition } from "@/types/competition";
import CompetitionCard from "@/components/home/CompetitionCard";
import styles from "./MoreCompetitions.module.css";

export default function MoreCompetitions({ current }: { current: Competition }) {
  const others = competitions.filter((c) => c.slug !== current.slug).slice(0, 4);

  return (
    <section>
      <div className={styles.head}>
        <Link href="/" className={styles.seeAll}>לעמוד הבית</Link>
        <h2 className="en">CHECK MORE COMPETITIONS</h2>
      </div>
      <div className={styles.grid}>
        {others.map((c) => (
          <CompetitionCard key={c.slug} competition={c} />
        ))}
      </div>
    </section>
  );
}
