import Image from "next/image";
import Link from "next/link";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import styles from "./CompetitionCarousel.module.css";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  return (
    <Link href={`/competitions/${competition.slug}`} className={styles.card}>
      <div className={styles.thumb}>
        <Image
          src={competition.image}
          alt={competition.name}
          fill
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className={styles.info}>
        <h3>
          <span className="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h3>
        <div className={styles.date} dir="ltr">{competition.date}</div>
        <div className={styles.loc}>{competition.location}</div>
        <span className={styles.btn}>לפרטים</span>
      </div>
    </Link>
  );
}
