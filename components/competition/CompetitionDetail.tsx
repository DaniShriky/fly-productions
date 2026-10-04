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

    // Explicitly (re)setting src here, not just relying on the JSX attribute
    // — see the matching comment in VideoSection.tsx: this effect's own
    // cleanup below does video.removeAttribute("src"), and React 18 dev-mode
    // StrictMode runs an effect, its cleanup, then the effect again on the
    // SAME DOM node, so without this the element is genuinely srcless on
    // that second run (dev-only; never caught before since this is the
    // first time this page was exercised in local dev rather than deploy).
    video.src = competition.videoFile!;

    // preload="none" on the element was only meant to avoid a decode/layout
    // pile-up at first paint, but it also delays the network fetch until
    // play() actually fires, which is what was making videos visibly stall
    // before starting (per Dani, 2026-10-04). Starting the fetch immediately
    // here gives it the full scroll-to-view time to buffer, while play()
    // itself stays gated by the delayed observer below exactly as before.
    video.preload = "auto";
    video.load();

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
    // Delayed observe(), not immediate — see the matching comment in
    // VideoSection.tsx about spreading this out from the rest of the
    // page's initial layout/image-decode work.
    const observeTimer = setTimeout(() => observer.observe(wrap), 400);
    return () => {
      clearTimeout(observeTimer);
      observer.disconnect();
      // iOS Safari doesn't reliably release a <video>'s decode buffers just
      // because the element got unmounted — across enough client-side page
      // navigations (each with its own multi-MB video) that memory pressure
      // can crash the WebKit render process, which Safari then reports as a
      // generic "a problem repeatedly occurred" page. Explicitly clearing
      // the source on unmount forces it to actually let go.
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
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
                preload="none"
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
          {/* descriptionParagraphs is sanitized with xss (lib/queries/
              competitions.ts) before it ever reaches this component — safe
              to render as-is here. */}
          {competition.descriptionParagraphs.map((html, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      </div>
    </section>
  );
}
