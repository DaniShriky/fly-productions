import Link from "next/link";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import styles from "./CompetitionCarousel.module.css";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  return (
    <div className={styles.card}>
      {/* TODO: replace with next/image once a real photo exists, e.g.
          <Image src={competition.thumbnailUrl} alt={competition.name} fill style={{objectFit:"cover"}} /> */}
      <div className={styles.thumb} style={{ background: competition.thumbnailGradient }} />
      <div className={styles.info}>
        <h3>
          <span className="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h3>
        <div className={styles.date}>{competition.date}</div>
        <div className={styles.loc}>{competition.location}</div>
        <Link href={`/competitions/${competition.slug}`} className={styles.btn}>
          לפרטים
        </Link>
      </div>
    </div>
  );
}
