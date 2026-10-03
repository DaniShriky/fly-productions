import { ReactNode } from "react";
import styles from "./AuthPageShell.module.css";

type Props = {
  title: string;
  // Optional "שלב X מתוך Y" indicator — e.g. /register is really two steps
  // (details, then email verification) with nothing previously showing
  // that, so a manager filling a long form had no idea a second step was
  // coming until she hit it.
  step?: { current: number; total: number };
  children: ReactNode;
};

// Shared centered-card layout for /register, /login, and /pending-approval —
// identical on all three, so it's a component rather than copy-pasted CSS.
export default function AuthPageShell({ title, step, children }: Props) {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {step && (
          <p className={styles.stepIndicator}>
            שלב {step.current} מתוך {step.total}
          </p>
        )}
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </main>
  );
}
