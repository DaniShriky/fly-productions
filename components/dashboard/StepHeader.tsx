import styles from "./StepHeader.module.css";

// The kicker/title/hint block was identical markup in EarlyRegistrationStatus
// and the dashboard page's step-2 section — pulled out once RegistrationStepper
// introduced a real, numbered "שלב N" for all three steps instead of just one.
export default function StepHeader({ kicker, title, hint }: { kicker: string; title: string; hint: string }) {
  return (
    <header>
      <p className={styles.kicker}>{kicker}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.hint}>{hint}</p>
    </header>
  );
}
