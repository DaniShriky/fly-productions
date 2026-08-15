import { useEffect, useRef } from "react";

/**
 * Drives a horizontally-scrollable element (overflow-x: auto) forward
 * automatically, while still allowing manual drag/swipe/scrollbar use.
 *
 * This is the React version of the vanilla-JS carousel logic from the
 * HTML prototype. Two things that caused real bugs there are handled
 * here structurally instead of by hand:
 *
 * 1. "Jumps after a while" — caused by requestAnimationFrame accumulating
 *    a huge delta when the tab is backgrounded. Fixed by clamping dt and
 *    resetting the frame timer on visibilitychange.
 * 2. "Only scrolls on narrow screens" — caused by not having enough
 *    duplicated content to overflow on wide screens. In the prototype we
 *    fixed this by cloning DOM nodes at runtime; in React, don't clone —
 *    just render the source array `repeatCount` times in JSX (see
 *    CompetitionCarousel.tsx / Testimonials.tsx). This hook only needs to
 *    know how many repeats exist to compute the correct wrap point.
 *
 * The container should have `direction: ltr` in CSS (see the .viewport
 * class in the accompanying .module.css files) so scrollLeft behaves
 * predictably — individual cards set `direction: rtl` back internally
 * so Hebrew text still reads correctly.
 */
export function useAutoScroll<T extends HTMLElement>(
  speed: number,
  repeatCount: number,
  disabled: boolean = false,
  pauseOnHover: boolean = true
) {
  const ref = useRef<T | null>(null);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let last: number | null = null;
    let frameId: number;

    const pauseNow = () => {
      paused = true;
      if (resumeTimer) clearTimeout(resumeTimer);
    };
    const resumeSoon = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        paused = false;
      }, 2500);
    };
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    const onVisibility = () => {
      if (!document.hidden) last = null;
    };

    if (pauseOnHover) {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    }
    el.addEventListener("touchstart", pauseNow, { passive: true });
    el.addEventListener("pointerdown", pauseNow);
    // "up" listeners go on window, not el: a drag that ends outside the
    // element (very easy to do — it's a wide, edge-to-edge strip) would
    // never fire touchend/pointerup on el itself, leaving it paused
    // forever. That's the "carousel stops after a while" bug.
    window.addEventListener("touchend", resumeSoon);
    window.addEventListener("pointerup", resumeSoon);
    document.addEventListener("visibilitychange", onVisibility);

    const step = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(ts - last, 50);
      last = ts;

      if (!paused && !disabledRef.current && repeatCount > 0) {
        const unitWidth = el.scrollWidth / repeatCount;
        if (unitWidth > 0) {
          const next = el.scrollLeft + (speed * dt) / 1000;
          // modulo instead of "if past the edge, subtract once" — avoids a
          // one-time large negative jump to scrollLeft at the wrap point,
          // which is a much rougher operation for the browser than a small
          // per-frame nudge and is the most likely spot for a stutter.
          el.scrollLeft = ((next % unitWidth) + unitWidth) % unitWidth;
        }
      }
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", pauseNow);
      el.removeEventListener("pointerdown", pauseNow);
      window.removeEventListener("touchend", resumeSoon);
      window.removeEventListener("pointerup", resumeSoon);
      document.removeEventListener("visibilitychange", onVisibility);
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, [speed, repeatCount, pauseOnHover]);

  return ref;
}
