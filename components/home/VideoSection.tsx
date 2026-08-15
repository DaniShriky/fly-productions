import { useEffect, useRef, useState } from "react";
import styles from "./VideoSection.module.css";

// FLY's general highlight reel, shown on the home page (not tied to a
// specific competition — each competition page gets its own video later
// via competition.videoUrl).
const HIGHLIGHT_VIDEO_ID = "jP5DCJajIKs";
const AMBIENT_SRC = `https://www.youtube.com/embed/${HIGHLIGHT_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HIGHLIGHT_VIDEO_ID}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

const QUOTE_PARAGRAPHS = [
  "FLY הפקות אירועים מדהימים יוצרת ומפיקה כבר למעלה מ־20 שנה תחרויות, פסטיבלים וכנסי מחול ברמה גבוהה, המארחים להקות, סטודיואים ורקדנים מכל רחבי הארץ ומחו״ל. כל אירוע נבנה מתוך הקפדה על מקצועיות, איכות וחוויה מרשימה.",
  "בלב התחרויות עומדת רמת שיפוט מקצועית ובלתי מתפשרת. שופטים וכוריאוגרפים מובילים מישראל ומחו״ל נבחרים בקפידה, לצד שיטת השיפוט הייחודית, הגלויה והמדויקת של FLY, המעניקה למנהלי הלהקות ולרקדנים משוב מקצועי ומשמעותי וכלים להמשך ההתפתחות.",
  "עם ניסיון של למעלה מ־20 שנה, FLY הפקות ממשיכה ליצור אירועים המשלבים במות גדולות ומושקעות, תאורה והגברה מתקדמות, הפקה מוקפדת, יחס אישי ואווירה חמה. המטרה נשארת אחת: להעניק לכל להקה ולכל רקדן חוויה מקצועית ומרגשת, ובמה ראויה לכישרון, להשקעה ולאהבה לעולם המחול.",
];

export default function VideoSection() {
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const sectionRef = useRef<HTMLButtonElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: isMuted ? "unMute" : "mute", args: [] }),
      "https://www.youtube.com"
    );
    setIsMuted(!isMuted);
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
          {hasEnteredView && (
            <div className={styles.ambientWrap}>
              <iframe
                ref={iframeRef}
                className={styles.ambientPlayer}
                src={AMBIENT_SRC}
                title="FLY Productions"
                allow="autoplay; encrypted-media"
                tabIndex={-1}
              />
            </div>
          )}
          <div className={styles.muteBtn}>{isMuted ? "🔇" : "🔊"}</div>
        </button>

        <div className={styles.quote}>
          {QUOTE_PARAGRAPHS.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
