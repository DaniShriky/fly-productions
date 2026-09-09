import { ReactNode } from "react";
import styles from "./AuthPageShell.module.css";

// Shared centered-card layout for /register, /login, and /pending-approval —
// identical on all three, so it's a component rather than copy-pasted CSS.
export default function AuthPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </main>
  );
}
