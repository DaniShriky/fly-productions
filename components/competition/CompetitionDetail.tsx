import { Competition } from "@/types/competition";
import { getInstagramEmbedUrl } from "@/lib/getInstagramEmbedUrl";
import styles from "./CompetitionDetail.module.css";

export default function CompetitionDetail({ competition }: { competition: Competition }) {
  const embedUrl = competition.videoUrl ? getInstagramEmbedUrl(competition.videoUrl) : null;

  return (
    <section>
      <div className={`${styles.detail} ${!embedUrl ? styles.noVideo : ""}`}>
        {embedUrl && (
          <div className={styles.videoCard}>
            <div className={styles.video}>
              <iframe
                src={embedUrl}
                title={competition.name}
                className={styles.videoFrame}
                allow="autoplay; encrypted-media"
                allowFullScreen
                scrolling="no"
              />
              {/* Instagram's embed has no "hide chrome" option — this masks
                  its own header/footer rows (account name, "View more on
                  Instagram", like/view counts) with solid covers so only
                  the video itself reads as visible. */}
              <div className={styles.videoMaskTop} />
              <div className={styles.videoMaskBottom} />
            </div>
          </div>
        )}
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
