import { useEffect, useState } from "react";
import Link from "next/link";
import { FaUniversalAccess, FaTimes } from "react-icons/fa";
import styles from "./AccessibilityWidget.module.css";

const STORAGE_KEY = "fly-a11y-settings";
const FONT_SCALE_STEPS = [1, 1.15, 1.3, 1.45];

type ToggleKey =
  | "contrast"
  | "grayscale"
  | "underlineLinks"
  | "readableFont"
  | "stopAnimations"
  | "focusOutline";

type Settings = Record<ToggleKey, boolean> & { fontScaleIndex: number };

const DEFAULT_SETTINGS: Settings = {
  contrast: false,
  grayscale: false,
  underlineLinks: false,
  readableFont: false,
  stopAnimations: false,
  focusOutline: false,
  fontScaleIndex: 0,
};

// Maps each toggle to the class this widget applies to <html> — the
// matching visual rules live in styles/globals.css, under "Accessibility
// widget effects", so they apply everywhere with one shared stylesheet.
const TOGGLE_CLASS: Record<ToggleKey, string> = {
  contrast: "a11y-contrast",
  grayscale: "a11y-grayscale",
  underlineLinks: "a11y-underline-links",
  readableFont: "a11y-readable-font",
  stopAnimations: "a11y-stop-animations",
  focusOutline: "a11y-focus-outline",
};

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "contrast", label: "ניגודיות גבוהה" },
  { key: "grayscale", label: "גווני אפור" },
  { key: "underlineLinks", label: "הדגשת קישורים" },
  { key: "readableFont", label: "פונט קריא" },
  { key: "stopAnimations", label: "עצירת אנימציות" },
  { key: "focusOutline", label: "הדגשת פוקוס למקלדת" },
];

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load any previously saved preferences once, on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // localStorage unavailable (e.g. private browsing) — defaults stand.
    }
  }, []);

  // Apply the current settings to <html> and persist them whenever they change.
  useEffect(() => {
    const root = document.documentElement;
    for (const key of Object.keys(TOGGLE_CLASS) as ToggleKey[]) {
      root.classList.toggle(TOGGLE_CLASS[key], settings[key]);
    }
    root.style.setProperty("--a11y-font-scale", String(FONT_SCALE_STEPS[settings.fontScaleIndex]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function toggle(key: ToggleKey) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function changeFontScale(dir: 1 | -1) {
    setSettings((prev) => ({
      ...prev,
      fontScaleIndex: Math.min(FONT_SCALE_STEPS.length - 1, Math.max(0, prev.fontScaleIndex + dir)),
    }));
  }

  return (
    <>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setOpen((o) => !o)}
        aria-label="תפריט נגישות"
        aria-expanded={open}
      >
        <FaUniversalAccess />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="תפריט נגישות">
          <div className={styles.panelHead}>
            <span>תפריט נגישות</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="סגירה"
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.fontRow}>
            <span>גודל טקסט</span>
            <div className={styles.fontBtns}>
              <button type="button" onClick={() => changeFontScale(-1)} aria-label="הקטנת טקסט">
                א-
              </button>
              <button type="button" onClick={() => changeFontScale(1)} aria-label="הגדלת טקסט">
                א+
              </button>
            </div>
          </div>

          {TOGGLES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.optionBtn} ${settings[key] ? styles.optionActive : ""}`}
              onClick={() => toggle(key)}
              aria-pressed={settings[key]}
            >
              {label}
            </button>
          ))}

          <button type="button" className={styles.resetBtn} onClick={() => setSettings(DEFAULT_SETTINGS)}>
            איפוס הגדרות
          </button>

          <Link href="/accessibility" className={styles.statementLink}>
            הצהרת נגישות
          </Link>
        </div>
      )}
    </>
  );
}
