import { Competition } from "@/types/competition";
import styles from "./CompetitionDetail.module.css";

export default function CompetitionDetail({ competition }: { competition: Competition }) {
  return (
    <section>
      <div className={styles.detail}>
        <div className={styles.videoCard}>
          {/* TODO: replace with a real <video> or embedded player once
              competition.videoUrl exists */}
          <div className={styles.video}>
            <div className={styles.playBtn}>▶</div>
          </div>
        </div>
        <div className={styles.description}>
          {/* dangerouslySetInnerHTML is safe here only because the paragraphs
              come from our own hardcoded data/competitions.ts file. Once this
              is fetched from Supabase, either keep this field admin-only
              (not user-submitted) or sanitize it (e.g. with the `dompurify`
              package) before rendering. */}
          {competition.descriptionParagraphs.map((html, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      </div>
    </section>
  );
}
