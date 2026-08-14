import Image from "next/image";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import styles from "./CompetitionHero.module.css";

export default function CompetitionHero({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  return (
    <section className={styles.hero}>
      <div className={styles.bg}>
        <Image
          src={competition.image}
          alt={competition.name}
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
      <div className={styles.fade} />
      <div className={styles.content}>
        <div className={styles.badge}>{competition.name}</div>
        <h1>
          <span className="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h1>
        <div className={styles.metaDate} dir="ltr">{competition.date}</div>
        <div className={styles.metaLoc}>{competition.location}</div>
        <a href="#" className={styles.routeBtn}>
          <span className={styles.circle}>➤</span>
          <span className={styles.routeLabel}>מסלול</span>
        </a>
      </div>
    </section>
  );
}
