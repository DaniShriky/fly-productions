// Tracks the active fade per video so a newer fade (e.g. rapid mute toggles,
// or scrolling a video in/out/in quickly) cancels any older one in flight
// instead of the two fighting over `video.volume`.
const activeFades = new WeakMap<HTMLVideoElement, symbol>();

// Ramps volume 0 -> 1 instead of jumping straight to full volume, so sound
// eases in when a video unmutes (autoplay-with-sound or the mute button)
// rather than cutting in abruptly.
export function fadeInVolume(video: HTMLVideoElement, duration = 600) {
  const token = Symbol();
  activeFades.set(video, token);
  const start = performance.now();
  video.volume = 0;

  function step(now: number) {
    if (activeFades.get(video) !== token) return;
    const progress = Math.min((now - start) / duration, 1);
    video.volume = progress;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
