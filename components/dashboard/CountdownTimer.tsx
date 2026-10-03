import { useEffect, useState } from "react";
import styles from "./CountdownTimer.module.css";

type Remaining = { days: number; hours: number; minutes: number };

function getRemaining(targetIso: string): Remaining | null {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

const UNITS: { key: keyof Remaining; label: string }[] = [
  { key: "days", label: "ימים" },
  { key: "hours", label: "שעות" },
  { key: "minutes", label: "דקות" },
];

// Live countdown to a price-tier cutoff (e.g. priceTiers.earlyUntil) — starts
// `null` (renders nothing) so server and client's first paint match exactly,
// then fills in once mounted. Granularity is minutes (no seconds shown), so
// a 20s poll is plenty fresh without re-rendering every second for no
// visible change. `null` is never set again after mount: once a studio
// manager has this page open and the deadline passes mid-session, it should
// flip straight to the "ended" state, not keep counting into negative numbers.
//
// Each digit is keyed by its own value, so React remounts (not just
// re-renders) the <span> whenever it changes — that remount is what retriggers
// the CSS "tick" animation in the module below, no JS animation-state needed.
export default function CountdownTimer({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setRemaining(getRemaining(target));
    const id = setInterval(() => setRemaining(getRemaining(target)), 20000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining === null) return null;

  // Under a week left — same urgency window a manager would actually act on
  // (video/stills cutoffs elsewhere use a similar "10 days" window, see
  // project_pricing_and_rules) — swaps the gold/blue theme for red.
  const urgent = remaining.days < 7;

  return (
    <div className={`${styles.timer} ${urgent ? styles.urgent : ""}`}>
      {UNITS.map(({ key, label }, i) => (
        <div key={key} className={styles.unitWrap}>
          {i > 0 && <span className={styles.colon}>:</span>}
          <div className={styles.unit}>
            <span key={remaining[key]} className={styles.value}>
              {String(remaining[key]).padStart(2, "0")}
            </span>
            <span className={styles.label}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
