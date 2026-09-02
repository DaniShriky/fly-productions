import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { testimonials } from "@/data/testimonials";
import styles from "./Testimonials.module.css";

const REPEAT = 3;
const SPEED = 35; // px/sec
const MAX_LINES = 4;

type ClampResult = { text: string; truncated: boolean };

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const measureCardRef = useRef<HTMLDivElement>(null);
  const measureQuoteRef = useRef<HTMLParagraphElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const trackItems = Array.from({ length: REPEAT }, () => testimonials).flat();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clampedQuotes, setClampedQuotes] = useState<Record<string, ClampResult>>({});

  // Card quotes are clamped to MAX_LINES by measuring actual rendered text
  // in a hidden clone (same width/font as a real card) rather than relying
  // on CSS -webkit-line-clamp — that approach cut the last line at a
  // fractional pixel height with these custom fonts, garbling glyphs and
  // dropping the "…" entirely. The modal always shows the untruncated quote.
  useLayoutEffect(() => {
    const quoteEl = measureQuoteRef.current;
    if (!quoteEl) return;

    function measure() {
      if (!quoteEl) return;
      quoteEl.textContent = "מ";
      const lineHeight = quoteEl.getBoundingClientRect().height;
      const maxHeight = lineHeight * MAX_LINES + 1;

      const next: Record<string, ClampResult> = {};
      for (const t of testimonials) {
        quoteEl.textContent = t.quote;
        if (quoteEl.getBoundingClientRect().height <= maxHeight) {
          next[t.id] = { text: t.quote, truncated: false };
          continue;
        }

        let lo = 0;
        let hi = t.quote.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          quoteEl.textContent = t.quote.slice(0, mid).trimEnd();
          if (quoteEl.getBoundingClientRect().height <= maxHeight) {
            lo = mid;
          } else {
            hi = mid - 1;
          }
        }

        let cut = t.quote.slice(0, lo).trimEnd();
        const lastSpace = cut.lastIndexOf(" ");
        if (lastSpace > cut.length * 0.6) cut = cut.slice(0, lastSpace);
        next[t.id] = { text: cut.trimEnd(), truncated: true };
      }
      setClampedQuotes(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const goPrev = () =>
    setSelectedIndex((i) => (i === null ? null : (i - 1 + testimonials.length) % testimonials.length));
  const goNext = () =>
    setSelectedIndex((i) => (i === null ? null : (i + 1) % testimonials.length));

  // Arrow-key navigation while the modal is open.
  useEffect(() => {
    if (selectedIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") setSelectedIndex(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedIndex]);

  // Move focus into the modal when it opens, and back to whatever
  // triggered it when it closes — guarded by wasOpenRef so navigating
  // between testimonials (selectedIndex changing while already open)
  // doesn't keep yanking focus back to the close button.
  useEffect(() => {
    const isOpen = selectedIndex !== null;
    if (isOpen && !wasOpenRef.current) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      closeBtnRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      previouslyFocusedRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [selectedIndex]);

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

  const selected = selectedIndex === null ? null : testimonials[selectedIndex];

  return (
    <section>
      <div className={styles.head}>
        <h2 className="en" lang="en">WHAT OUR CLIENTS ARE SAYING</h2>
      </div>
      {/* Off-screen clone used only to measure how much of each quote fits
          in MAX_LINES at the card's real width/font — see the effect above.
          The fixed 0x0 clipped wrapper keeps it from ever affecting page
          scroll size, regardless of the cloned card's own width/position. */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden" }}>
        <div
          ref={measureCardRef}
          className={styles.card}
          style={{ visibility: "hidden", width: 260, height: "auto" }}
          aria-hidden="true"
        >
          <p ref={measureQuoteRef} className={styles.quote} />
        </div>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.viewport}>
          <div ref={trackRef} className={styles.track}>
            {trackItems.map((t, i) => {
              const clamp = clampedQuotes[t.id];
              return (
                <button
                  key={`${t.id}-${i}`}
                  type="button"
                  className={styles.card}
                  onClick={() => setSelectedIndex(i % testimonials.length)}
                  aria-label={`המלצה מלאה מאת ${t.studioName}, ${t.city}`}
                >
                  <div className={styles.stars}>★★★★★</div>
                  <p className={styles.quote}>
                    {clamp ? clamp.text : t.quote}
                    {clamp?.truncated && <span className={styles.ellipsis}>…</span>}
                  </p>
                  <div className={styles.who}>
                    {t.studioName}
                    <br />
                    {t.city}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.fadeLeft} />
        <div className={styles.fadeRight} />
      </div>

      {selected && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`המלצה מאת ${selected.studioName}`}
        >
          <button
            type="button"
            className={styles.navBtn}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="ההמלצה הקודמת"
          >
            ‹
          </button>

          <div className={styles.expanded} onClick={(e) => e.stopPropagation()}>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedIndex(null)}
              aria-label="סגירה"
            >
              ✕
            </button>
            <div className={styles.expandedBody}>
              <div className={styles.stars}>★★★★★</div>
              <p className={styles.quote}>{selected.quote}</p>
              <div className={styles.who}>
                {selected.studioName}
                <br />
                {selected.city}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="ההמלצה הבאה"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
