import { ArrowBackIcon } from "./icons";
import styles from "./StepHeader.module.css";

// The kicker/title/hint block was identical markup in EarlyRegistrationStatus
// and the dashboard page's step-2 section — pulled out once RegistrationStepper
// introduced a real, numbered "שלב N" for all three steps instead of just one.
type Props = {
  kicker: string;
  title: string;
  hint?: string;
  // Steps 2 and 3 pass these — the stepper tabs above already let you jump
  // back, but Dani asked for an explicit button too since the tabs alone
  // weren't obvious enough as a way back. backTo names the step the button
  // actually lands on, since that's not always step - 1 in general.
  onBack?: () => void;
  backTo?: number;
};

export default function StepHeader({ kicker, title, hint, onBack, backTo }: Props) {
  return (
    <header>
      {onBack && (
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowBackIcon size={14} />
          חזרה לשלב {backTo}
        </button>
      )}
      <p className={styles.kicker}>{kicker}</p>
      <h2 className={styles.title}>{title}</h2>
      {hint && <p className={styles.hint}>{hint}</p>}
    </header>
  );
}
