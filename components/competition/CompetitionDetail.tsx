import { useEffect, useRef, useState } from "react";
import { Competition } from "@/types/competition";
import { fadeInVolume } from "@/lib/fadeInVolume";
import styles from "./CompetitionDetail.module.css";

export default function CompetitionDetail({ competition }: { competition: Competition }) {
  const hasVideo = Boolean(competition.videoFile);

  const [isMuted, setIsMuted] = useState(true);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Tracks an explicit user mute/unmute choice, so the auto-mute-when-
  // off-screen behavior below doesn't clobber it once the video scrolls
  // back into view. Same pattern as VideoSection.
  const userMutedRef = useRef(false);

  useEffect(() => {
    const wrap = videoWrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userMutedRef.current) {
            video.muted = false;
            fadeInVolume(video);
            video.play().catch(() => {
              video.muted = true;
              video.play();
            });
          } else {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
        setIsMuted(video.muted);
      },
      { threshold: 0.3 }
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    userMutedRef.current = next;
    setIsMuted(next);
    if (!next) fadeInVolume(video);
  };

  return (
    <section>
      {/* No visible section title by design — kept for screen readers so
          heading-based navigation still has a landmark to land on. */}
      <h2 className="sr-only">אודות התחרות</h2>
      <div className={`${styles.detail} ${!hasVideo ? styles.noVideo : ""}`}>
        {hasVideo && (
          <div className={styles.videoCard}>
            <div ref={videoWrapRef} className={styles.video}>
              <video
                ref={videoRef}
                className={styles.videoFrame}
                src={competition.videoFile}
                muted
                loop
                playsInline
                preload="auto"
                tabIndex={-1}
              />
              <button
                type="button"
                className={styles.muteBtn}
                onClick={toggleMute}
                aria-label={isMuted ? "הפעלת קול לסרטון" : "השתקת הסרטון"}
              >
                {isMuted ? (
                  <svg
                    className={styles.muteIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <line x1="22" y1="9" x2="16" y2="15" />
                    <line x1="16" y1="9" x2="22" y2="15" />
                  </svg>
                ) : (
                  <svg
                    className={styles.muteIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                )}
              </button>
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
