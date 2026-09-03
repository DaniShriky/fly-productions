import { useEffect, useRef } from "react";
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // Sound follows visibility: unmuted while the video is on screen, muted
    // once it scrolls away, so nothing needs a manual mute toggle. Browsers
    // that block unmuted autoplay without a prior user gesture just keep it
    // muted until one happens (a click/scroll elsewhere on the page).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = false;
          video.play().catch(() => {
            video.muted = true;
            video.play();
          });
        } else {
          video.muted = true;
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
              preload="auto"
              tabIndex={-1}
            />
          </div>
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
