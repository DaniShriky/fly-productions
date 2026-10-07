import styles from "./AdminTabs.module.css";

export type AdminTab = "pending" | "managers" | "registrations" | "dates";

type TabDef = { tab: AdminTab; label: string };

const TABS: TabDef[] = [
  { tab: "pending", label: "בקשות ממתינות" },
  { tab: "managers", label: "מנהלי סטודיו" },
  { tab: "registrations", label: "ריקודים ותשלומים" },
  { tab: "dates", label: "מועדי הרשמה" },
];

type Props = {
  active: AdminTab;
  onSelect: (tab: AdminTab) => void;
  // Per-tab count badge — omitted (no badge shown) for a tab not present as
  // a key, shown as 0 explicitly if present with value 0. Only "pending"
  // actually has one today, since it's the one tab whose whole point is
  // "things waiting for a decision" — a count on the other tabs wouldn't
  // tell Dani anything actionable the way this one does.
  counts?: Partial<Record<AdminTab, number>>;
};

// Simple, independent view switcher — not a sequential wizard (unlike the
// dashboard's RegistrationStepper, which that component's own comment
// reserves for actual process/progress state), so this deliberately uses
// the site's gold "this is selected" language instead of the stepper's blue
// "process" one. Per Dani, 2026-10-05: /admin was one long page stacking
// every section — splitting it into tabs (plus a badge count on the one tab
// that actually needs attention) is meant to make it obvious what needs
// looking at and quick to get to anything else, instead of scrolling past
// a big payments table to find the smaller approval queues.
export default function AdminTabs({ active, onSelect, counts }: Props) {
  return (
    <nav className={styles.tabs} aria-label="אזורי ניהול">
      {TABS.map(({ tab, label }) => {
        const count = counts?.[tab];
        return (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${tab === active ? styles.tabActive : ""}`}
            onClick={() => onSelect(tab)}
            aria-current={tab === active ? "page" : undefined}
          >
            {label}
            {!!count && <span className={styles.badge}>{count}</span>}
          </button>
        );
      })}
    </nav>
  );
}
