import { useEffect, useRef, useState } from "react";
import { testimonials } from "@/data/testimonials";
import { Testimonial } from "@/types/testimonial";
import styles from "./Testimonials.module.css";

const REPEAT = 3;
const SPEED = 35; // px/sec

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackItems = Array.from({ length: REPEAT }, () => testimonials).flat();
  const [selected, setSelected] = useState<Testimonial | null>(null);

  // Drives the track with a CSS transform instead of native scrollLeft.
  // This carousel doesn't need manual drag-to-scroll (cards are click-to-
  // expand, not swiped), so a transform loop sidesteps every native-scroll
  // quirk — momentum, scroll-anchoring, snap, smooth-scroll interpolation —
  // that could stall a scrollLeft-driven animation in some browsers.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let offset = 0;
    let last: number | null = null;
    let frameId: number;

    const step = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(ts - last, 50);
      last = ts;

      const unitWidth = track.scrollWidth / REPEAT;
      if (unitWidth > 0) {
        offset = (offset + (SPEED * dt) / 1000) % unitWidth;
        track.style.transform = `translateX(${-offset}px)`;
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <section>
      <div className={styles.head}>
        <h2 className="en">WHAT OUR CLIENTS ARE SAYING</h2>
      </div>
      <div className={styles.wrapper}>
        <div className={styles.viewport}>
          <div ref={trackRef} className={styles.track}>
            {trackItems.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className={styles.card}
                onClick={() => setSelected(t)}
              >
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.quote}>{t.quote}</p>
                <div className={styles.who}>
                  {t.studioName}
                  <br />
                  {t.city}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.fadeLeft} />
        <div className={styles.fadeRight} />
      </div>

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.expanded} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelected(null)}
              aria-label="סגירה"
            >
              ✕
            </button>
            <div className={styles.stars}>★★★★★</div>
            <p className={styles.quote}>{selected.quote}</p>
            <div className={styles.who}>
              {selected.studioName}
              <br />
              {selected.city}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
