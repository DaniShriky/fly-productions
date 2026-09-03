import Image from "next/image";
import Link from "next/link";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import { getCompetitionDays, getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import { breakAfterTwoWords } from "@/lib/breakAfterTwoWords";
import styles from "./CompetitionCarousel.module.css";

export default function CompetitionCard({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };
  const [titleLine1, titleLine2] = breakAfterTwoWords(main);
  const isTwoLines = Boolean(titleLine2) || Boolean(suffix);

  return (
    <Link href={`/competitions/${competition.slug}`} className={styles.card}>
      <div className={styles.thumb}>
        <Image
          src={competition.image}
          alt={competition.name}
          fill
          style={{ objectFit: "cover" }}
        />
        {competition.logo && (
          <div className={styles.logoBadge}>
            <Image src={competition.logo} alt="" fill style={{ objectFit: "contain" }} />
          </div>
        )}
      </div>
      <div className={`${styles.info} ${isTwoLines ? styles.infoTwoLines : ""}`}>
        <h3>
          <span className="en" lang="en">
            {titleLine1}
            {titleLine2 && (
              <>
                <br />
                {titleLine2}
              </>
            )}
          </span>
          {suffix && (
            <>
              <br />
              <span className={styles.religiousSuffix}>{suffix}</span>
            </>
          )}
        </h3>
        <div className={styles.date} dir="ltr" lang="en">{getCompetitionDateLabel(competition.date)}</div>
        <div className={styles.day}>{getCompetitionDays(competition.date)}</div>
        <div className={styles.loc}>{competition.location}</div>
        <span className={styles.btn}>
          לכל הפרטים על התחרות{" "}
          {/* An SVG, not the "↗" character — some phones render that glyph
              as a colorful emoji instead of plain text. */}
          <svg className={styles.arrowIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M7 17L17 7M17 7H8M17 7V16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
