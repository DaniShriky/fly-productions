import { useEffect, useRef, useState } from "react";
import styles from "./VideoSection.module.css";

// FLY's general highlight reel, shown on the home page (not tied to a
// specific competition — each competition page gets its own video later
// via competition.videoUrl).
const HIGHLIGHT_VIDEO_ID = "jP5DCJajIKs";
const AMBIENT_SRC = `https://www.youtube.com/embed/${HIGHLIGHT_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HIGHLIGHT_VIDEO_ID}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

// TODO: placeholder — swap for a real quote FLY picks (about dance/their
// competitions). Same idea as the descriptionParagraphs TODOs in
// data/competitions.ts.
const QUOTE = "מחול הוא השפה שבה הגוף מספר את מה שהמילים לא מצליחות לומר.";

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
          <p>{QUOTE}</p>
        </div>
      </div>
    </section>
  );
}
