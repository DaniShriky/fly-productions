import { useEffect, useRef, useState } from "react";
import { ISRAELI_CITIES } from "@/lib/cities";
import styles from "./CityAutocomplete.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

// Replaces the old <select> + separate "אחר" free-text field (per Dani,
// 2026-10-10: type and get suggestions as you go) — used by both
// RegistrationDetailsForm.tsx and ProfileEditForm.tsx, which is why this is
// a real shared component (not duplicated CSS the way this codebase
// normally handles cross-file styling — the filtering/open-close behavior
// is real logic, not just a visual rule, so one bug fix here should apply
// everywhere it's used). Typing freely IS the "other city" fallback now —
// there's no separate branch for it: whatever the manager types is the
// value, whether or not it matches a suggestion.
export default function CityAutocomplete({ value, onChange, required }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const query = value.trim();
  const suggestions = query
    ? ISRAELI_CITIES.filter((c) => c.includes(query)).slice(0, 8)
    : ISRAELI_CITIES.slice(0, 8);

  return (
    <div ref={rootRef} className={styles.wrap}>
      <input
        type="text"
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="הקלידו יישוב..."
      />
      {open && suggestions.length > 0 && (
        <div className={styles.menu}>
          {suggestions.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.option}
              // onMouseDown (not onClick) fires before the input loses
              // focus, avoiding any focus/blur race with the menu closing
              // out from under the click.
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setOpen(false);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
