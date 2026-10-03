import { ArrowBackIcon } from "./icons";
import styles from "./StepHeader.module.css";

// The kicker/title/hint block was identical markup in EarlyRegistrationStatus
// and the dashboard page's step-2 section — pulled out once RegistrationStepper
// introduced a real, numbered "שלב N" for all three steps instead of just one.
type Props = {
  kicker: string;
  title: string;
  hint?: string;
  // Only step 2 passes this — the stepper tabs above already let you jump
  // back, but Dani asked for an explicit button too since the tabs alone
  // weren't obvious enough as a way back to step 1.
  onBack?: () => void;
};

export default function StepHeader({ kicker, title, hint, onBack }: Props) {
  return (
    <header>
      {onBack && (
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowBackIcon size={14} />
          חזרה לשלב 1
        </button>
      )}
      <p className={styles.kicker}>{kicker}</p>
      <h2 className={styles.title}>{title}</h2>
      {hint && <p className={styles.hint}>{hint}</p>}
    </header>
  );
}
