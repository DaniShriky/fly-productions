import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { testimonials } from "@/data/testimonials";
import { useAutoScroll } from "@/lib/useAutoScroll";
import styles from "./Testimonials.module.css";

const REPEAT = 3;
const SPEED = 35; // px/sec
const MAX_LINES = 4;

type ClampResult = { text: string; truncated: boolean };

// Module-level, not component state — persists across mounts within the
// same page session. Navigating home -> a competition page -> home again
// fully unmounts and remounts this component each time (separate top-level
// pages, not a re-render), which previously reran this whole binary-search
// measurement pass — real layout work, once per testimonial — on every
// single return to the homepage. Since the testimonials data and the
// available card width are almost always unchanged between visits, that
// work was pure repetition. Caching by width skips it whenever nothing
// that could change the result actually has.
let clampCache: { width: number; result: Record<string, ClampResult> } | null = null;

export default function Testimonials() {
  const scrollRef = useAutoScroll<HTMLDivElement>(SPEED, REPEAT);
  const measureCardRef = useRef<HTMLDivElement>(null);
  const measureQuoteRef = useRef<HTMLParagraphElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const trackItems = Array.from({ length: REPEAT }, () => testimonials).flat();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clampedQuotes, setClampedQuotes] = useState<Record<string, ClampResult>>(
    () => clampCache?.result ?? {}
  );

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

      const width = window.innerWidth;
      if (clampCache && clampCache.width === width) {
        setClampedQuotes(clampCache.result);
        return;
      }

      // Read line-height from computed style rather than rendering a
      // sample glyph and measuring its box — a Hebrew "מ" renders through
      // Assistant, but testimonials with Cyrillic/Latin text fall back to
      // a different font with different glyph metrics, so a glyph-based
      // baseline under-measured the real per-line height for those quotes
      // and let a 5th/6th line slip past MAX_LINES. line-height: 1.5 in
      // the CSS is unitless, so the computed value below is a fixed px
      // number independent of which font ends up rendering the text.
      const lineHeight = parseFloat(getComputedStyle(quoteEl).lineHeight);
      const maxHeight = lineHeight * MAX_LINES + 1;

      const next: Record<string, ClampResult> = {};
      for (const t of testimonials) {
        quoteEl.textContent = t.quote;
        if (quoteEl.getBoundingClientRect().height <= maxHeight) {
          next[t.id] = { text: t.quote, truncated: false };
          continue;
        }

        // Measured with the trailing "…" appended (matching what's actually
        // rendered — see the truncated-quote JSX below) — without it, a cut
        // landing right at the line-4 edge could fit as plain text but wrap
        // to a 5th line once the ellipsis glyph's own width was added on
        // render, which is exactly what let cards intermittently overflow.
        let lo = 0;
        let hi = t.quote.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          quoteEl.textContent = t.quote.slice(0, mid).trimEnd() + "…";
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
      clampCache = { width, result: next };
      setClampedQuotes(next);
    }

    measure();
    // Re-measure once webfonts finish loading — if the first measure() runs
    // before Hubot Sans/Assistant are ready, it clamps using the fallback
    // font's metrics, then the real font swaps in with different line
    // height/character width and the "4 lines" of cut text no longer is,
    // overflowing the card. document.fonts.ready catches that race; the
    // resize listener alone doesn't (no resize actually happens on font swap).
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    // Debounced — iOS Safari fires resize repeatedly *while scrolling* as
    // its toolbar collapses/expands with the changing visual viewport
    // height. Running this straight off each event forces a fresh
    // getBoundingClientRect binary-search per testimonial (real layout
    // work) on every one of those, hijacking the main thread mid-scroll —
    // exactly when both carousels' animation frames most need it. Only
    // the settled final size actually matters here, so waiting for resize
    // events to stop for a moment is free.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedMeasure = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 200);
    };

    window.addEventListener("resize", debouncedMeasure);
    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", debouncedMeasure);
    };
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

  const selected = selectedIndex === null ? null : testimonials[selectedIndex];

  return (
    <section>
      <div className={styles.head}>
        <h2>לקוחות מספרים</h2>
      </div>
      {/* Off-screen clone used only to measure how much of each quote fits
          in MAX_LINES at the card's real width/font — see the effect above.
          The fixed 0x0 clipped wrapper keeps it from ever affecting page
          scroll size, regardless of the cloned card's own width/position.
          It must be `display: flex` so .card's own `flex: 0 0 260px` (and
          the 230px mobile override) actually sizes it as a flex item —
          a hardcoded inline width here previously stayed 260px even on
          mobile, where real cards narrow to 230px, so text was measured
          wider than it actually renders and under-truncated, overflowing
          past MAX_LINES on phones. */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", display: "flex" }}>
        <div
          ref={measureCardRef}
          className={styles.card}
          style={{ visibility: "hidden", height: "auto" }}
          aria-hidden="true"
        >
          <p ref={measureQuoteRef} className={styles.quote} />
        </div>
      </div>

      <div className={styles.wrapper}>
        <div ref={scrollRef} className={styles.viewport}>
          <div className={styles.track}>
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
