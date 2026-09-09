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
 * Manual drag/swipe-to-browse still works: the container keeps native
 * `overflow-x: auto` (see .viewport in each .module.css), and a native
 * scrollLeft change composes fine with the track's own CSS transform —
 * they're independent, the visible position is just both added together.
 * Pausing the animation while the user's finger is down (so it doesn't
 * fight their drag) is the same `:active` rule as `:hover`, not JS.
 *
 * Dragging is also infinite, without needing more than the two repeats
 * already there for the animation's seamless wrap: a `scroll` listener
 * silently snaps scrollLeft by exactly one repeated unit whenever a drag
 * reaches either edge (see handleScroll below) — memory stays fixed at
 * repeatCount copies no matter how far anyone drags.
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

    // The animation itself starts paused (see the .module.css ":not(.marquee-ready)"
    // rule) and JS only lifts that shortly after mount. A page transition
    // already has to lay out and decode every image in this carousel (and
    // any autoplaying video) all at once; also asking the compositor to
    // immediately start animating that many image layers in the very same
    // instant is exactly the kind of pile-up that can make a phone browser
    // flag the page as unresponsive and force-reload it (Safari's "a
    // problem repeatedly occurred") — one real occurrence of that was
    // caught navigating straight between two competition pages, not just
    // via the homepage, which pointed at this shared piece rather than
    // anything homepage-specific. Giving layout/decode a moment to settle
    // before the animation joins in spreads the work out instead of
    // stacking it all on the same frame.
    const readyTimer = setTimeout(() => {
      el.classList.add("marquee-ready");
    }, 350);
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

    // Manual drag/swipe (native scrollLeft) is bounded by however much
    // duplicated content actually exists in the DOM — drag far enough and
    // you hit the real end, with nothing further to reveal, even though
    // the animation itself loops forever. Rather than adding more repeats
    // (unbounded memory for a still-finite drag distance), silently snap
    // scrollLeft by exactly one repeated unit's width whenever a drag
    // reaches either edge — since that unit is a duplicate of the next,
    // landing on the equivalent scroll position in it is visually
    // identical, so the jump isn't visible. This only reacts to real
    // scrollLeft changes (manual drag), never to the CSS transform, so it
    // can't fight the animation or need any touch/pointer tracking.
    const handleScroll = () => {
      if (repeatCount < 2) return;
      const unitWidth = el.scrollWidth / repeatCount;
      if (unitWidth <= 0) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft <= 0) {
        el.scrollLeft += unitWidth;
      } else if (el.scrollLeft >= maxScroll - 1) {
        el.scrollLeft -= unitWidth;
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });

    // A no-op touchstart is enough to make iOS Safari actually apply
    // :active on tap — with no touch listener present at all, it skips
    // :active on non-form elements entirely as part of its tap-vs-scroll
    // disambiguation. The pause itself is the CSS :active rule; this just
    // switches that on.
    const noop = () => {};
    el.addEventListener("touchstart", noop, { passive: true });

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("load", measure);
      window.removeEventListener("resize", debouncedMeasure);
      el.removeEventListener("touchstart", noop);
      el.removeEventListener("scroll", handleScroll);
    };
  }, [speed, repeatCount, disabled]);

  return ref;
}
