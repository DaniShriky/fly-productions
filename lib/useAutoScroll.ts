import { useEffect, useRef } from "react";

/**
 * Drives an infinitely-looping horizontal marquee via a pure CSS animation
 * (see the `.track` / `@keyframes` rules in each consumer's .module.css),
 * rather than a requestAnimationFrame loop nudging `scrollLeft` by hand.
 *
 * That JS-driven version kept breaking on real phones in ways that never
 * reproduced in testing: iOS throttles rAF callbacks on an otherwise-idle
 * page (no fix from inside the callback itself can outrun that), and the
 * touch handlers meant to pause/resume it for manual swipe support had
 * repeated "cancelled, not ended" gaps (touchcancel vs touchend,
 * pointercancel vs pointerup) that could leave it stuck paused. A CSS
 * animation runs on the compositor regardless of main-thread/rAF
 * throttling, and pausing it is `animation-play-state` via plain
 * `:hover`/`:active` in CSS — no JS state to get stuck.
 *
 * The trade-off: this drops native manual drag/swipe-to-browse (that's
 * what needed the touch handling in the first place). Tapping a card still
 * works for a closer look where that's wired up (e.g. Testimonials' modal).
 *
 * This hook's job is just measuring: it sets `--marquee-distance` (one
 * unit's width — the content divided by how many times it's repeated in
 * the JSX, see CompetitionCarousel.tsx / Testimonials.tsx) and
 * `--marquee-duration` (that distance at the given px/sec speed) as CSS
 * custom properties on the element, so the animation covers the actual
 * rendered content width at a consistent speed regardless of how much
 * content there is. The container still needs `direction: ltr` in CSS
 * (see the .viewport class in the accompanying .module.css files) so the
 * flex layout order — and therefore which direction translateX needs to
 * move to reveal the next item — stays predictable; individual cards set
 * `direction: rtl` back internally so Hebrew text still reads correctly.
 */
export function useAutoScroll<T extends HTMLElement>(
  speed: number,
  repeatCount: number,
  disabled: boolean = false
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || repeatCount <= 0) return;

    function measure() {
      if (!el) return;
      const unitWidth = el.scrollWidth / repeatCount;
      if (unitWidth > 0) {
        el.style.setProperty("--marquee-distance", `${unitWidth}px`);
        el.style.setProperty("--marquee-duration", `${unitWidth / speed}s`);
      }
    }

    measure();
    // Re-measure once images have their real box and webfonts have
    // swapped in — either can change the content's actual width after
    // this first pass.
    window.addEventListener("load", measure);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedMeasure = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 200);
    };
    window.addEventListener("resize", debouncedMeasure);

    // A no-op touchstart is enough to make iOS Safari actually apply
    // :active on tap — with no touch listener present at all, it skips
    // :active on non-form elements entirely as part of its tap-vs-scroll
    // disambiguation. The pause itself is the CSS :active rule; this just
    // switches that on.
    const noop = () => {};
    el.addEventListener("touchstart", noop, { passive: true });

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("load", measure);
      window.removeEventListener("resize", debouncedMeasure);
      el.removeEventListener("touchstart", noop);
    };
  }, [speed, repeatCount, disabled]);

  return ref;
}
