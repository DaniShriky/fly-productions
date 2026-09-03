import { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <section style={{ paddingTop: 10 }}>
      <div className={styles.row}>
        <button
          ref={sectionRef}
          type="button"
          className={styles.videoSection}
          onClick={toggleMute}
          aria-label={isMuted ? "הפעלת קול לסרטון" : "השתקת הסרטון"}
        >
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
          <div className={styles.muteBtn}>{isMuted ? "🔇" : "🔊"}</div>
        </button>

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
