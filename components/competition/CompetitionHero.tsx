import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import styles from "./CompetitionHero.module.css";

export default function CompetitionHero({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  return (
    <section className={styles.hero}>
      {/* TODO: replace with a real photo (see components/home/Hero.tsx note) */}
      <div className={styles.bg} style={{ background: competition.heroGradient }} />
      <div className={styles.fade} />
      <div className={styles.content}>
        <div className={styles.badge}>{competition.name}</div>
        <h1>
          <span className="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h1>
        <div className={styles.metaDate}>{competition.date}</div>
        <div className={styles.metaLoc}>{competition.location}</div>
        <a href="#" className={styles.routeBtn}>
          <span className={styles.circle}>➤</span>
          <span className={styles.routeLabel}>מסלול</span>
        </a>
      </div>
    </section>
  );
}
