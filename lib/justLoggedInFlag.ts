// Marks the moment a studio manager actually logs in (pages/login.tsx, right
// before redirecting to /dashboard) so the dashboard can show a one-time
// "just logged in" popup (ReservationNotice) without it reappearing on every
// later refresh of /dashboard within the same session — consuming the flag
// (reading + clearing it) is what limits it to exactly once per login.
const KEY = "fly-just-logged-in";

export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — the dashboard
    // popup simply won't fire this time, which is an acceptable miss here.
  }
}

export function consumeJustLoggedIn(): boolean {
  try {
    const seen = sessionStorage.getItem(KEY);
    if (seen) sessionStorage.removeItem(KEY);
    return Boolean(seen);
  } catch {
    return false;
  }
}
