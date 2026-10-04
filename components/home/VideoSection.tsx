import { useEffect, useRef, useState } from "react";
import { fadeInVolume } from "@/lib/fadeInVolume";
import styles from "./VideoSection.module.css";

// Self-hosted from /public/videos/highlight.mp4 (not a YouTube embed) so
// there's no external script/API handshake delay once it does start.
const HIGHLIGHT_VIDEO_SRC = "/videos/highlight.mp4";

const QUOTE_PARAGRAPHS = [
  "FLY הפקות אירועים מדהימים יוצרת ומפיקה כבר למעלה מ־20 שנה תחרויות, פסטיבלים וכנסי מחול ברמה גבוהה, המארחים להקות, סטודיואים ורקדנים מכל רחבי הארץ ומחו״ל. כל אירוע נבנה מתוך הקפדה על מקצועיות, איכות וחוויה מרשימה.",
  "בלב התחרויות עומדת רמת שיפוט מקצועית ובלתי מתפשרת. שופטים וכוריאוגרפים מובילים מישראל ומחו״ל נבחרים בקפידה, לצד שיטת השיפוט הייחודית, הגלויה והמדויקת של FLY, המעניקה למנהלי הלהקות ולרקדנים משוב מקצועי ומשמעותי וכלים להמשך ההתפתחות.",
  "עם ניסיון של למעלה מ־20 שנה, FLY הפקות ממשיכה ליצור אירועים המשלבים במות גדולות ומושקעות, תאורה והגברה מתקדמות, הפקה מוקפדת, יחס אישי ואווירה חמה. המטרה נשארת אחת: להעניק לכל להקה ולכל רקדן חוויה מקצועית ומרגשת, ובמה ראויה לכישרון, להשקעה ולאהבה לעולם המחול.",
];

export default function VideoSection() {
  const [isMuted, setIsMuted] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Tracks an explicit user mute/unmute choice, so the auto-mute-when-
  // off-screen behavior below doesn't clobber it once the video scrolls
  // back into view.
  const userMutedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // Explicitly (re)setting src here, not just relying on the JSX attribute,
    // matters because of this effect's own cleanup below: React 18 dev-mode
    // StrictMode runs an effect, its cleanup, then the effect again, all on
    // the SAME DOM node (no real re-render in between) — so the cleanup's
    // video.removeAttribute("src") leaves the element genuinely srcless on
    // that second run, since nothing else restores it (production only
    // invokes the effect once, so this is dev-only, but it's the first time
    // this page has been exercised in local dev rather than the deployed
    // preview, which is why it wasn't caught earlier).
    video.src = HIGHLIGHT_VIDEO_SRC;

    // preload="none" on the element itself only avoids a decode/layout pile-up
    // in the very first paint (see the observeTimer comment below) — it isn't
    // meant to also delay the network fetch, but leaving preload="none" in
    // place does exactly that: nothing downloads until play() is actually
    // called at the 400ms+intersection point, so the video visibly stalls
    // there instead of being ready. Kicking the fetch off here, immediately
    // on mount, gives it the full scroll-to-view time to buffer while still
    // leaving the heavier decode/play() work gated below (per Dani,
    // 2026-10-04: videos were taking a long time to start).
    video.preload = "auto";
    video.load();

    // Playback follows visibility: plays (with sound, unless the user muted
    // it themselves) while the video is on screen, pauses once it scrolls
    // away. Browsers that block unmuted autoplay without a prior user
    // gesture just keep it muted until one happens (a click/scroll
    // elsewhere on the page).
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
    // Delayed observe(), not immediate: on mount this section is very
    // likely already on screen, so an immediate observe() fires the
    // callback (and starts decoding/playing the video) in the very same
    // instant the page is also laying out and decoding every carousel
    // image — see the matching comment in lib/useAutoScroll.ts about
    // that pile-up being a plausible trigger for Safari's mobile
    // unresponsive-page watchdog.
    const observeTimer = setTimeout(() => observer.observe(section), 400);
    return () => {
      clearTimeout(observeTimer);
      observer.disconnect();
      // See the matching comment in CompetitionDetail.tsx — iOS Safari
      // doesn't reliably free a <video>'s decode buffers just because the
      // element unmounted, and that accumulates across navigations.
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
    <section style={{ paddingTop: 10 }}>
      <div className={styles.row}>
        <div ref={sectionRef} className={styles.videoSection}>
          <div className={styles.ambientWrap}>
            <video
              ref={videoRef}
              className={styles.ambientPlayer}
              src={HIGHLIGHT_VIDEO_SRC}
              muted
              loop
              playsInline
              preload="none"
              tabIndex={-1}
            />
          </div>
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

        <div className={styles.quote}>
          {/* No visible section title by design — kept for screen readers
              so heading-based navigation still has a landmark to land on. */}
          <h2 className="sr-only">אודות FLY הפקות</h2>
          {QUOTE_PARAGRAPHS.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
