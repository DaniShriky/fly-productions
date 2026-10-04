import { CheckIcon } from "./icons";
import styles from "./RegistrationStepper.module.css";

export type RegistrationStep = 1 | 2 | 3;

const STEPS: { step: RegistrationStep; label: string }[] = [
  { step: 1, label: "הוספת ריקודים" },
  { step: 2, label: "סיכום הזמנה" },
  { step: 3, label: "אישורים והגשה" },
];

type Props = {
  active: RegistrationStep;
  onSelect: (step: RegistrationStep) => void;
};

// A purely navigational indicator, not a data-driven one: a step reads as
// "done" once you've moved past it, regardless of whether it's actually
// complete. Both steps stay reachable at any time; a studio manager needs to
// jump back and forth (add a dance, check the total, add another) far more
// than she needs to be gated forward.
export default function RegistrationStepper({ active, onSelect }: Props) {
  return (
    <nav className={styles.stepper} aria-label="שלבי ההרשמה">
      {STEPS.map(({ step, label }, index) => {
        const isActive = step === active;
        const isDone = step < active;

        return (
          <div key={step} style={{ display: "contents" }}>
            {index > 0 && <div className={`${styles.connector} ${step <= active ? styles.connectorDone : ""}`} />}
            <button
              type="button"
              className={styles.step}
              onClick={() => onSelect(step)}
              aria-current={isActive ? "step" : undefined}
            >
              <span className={`${styles.circle} ${isActive ? styles.circleActive : ""} ${isDone ? styles.circleDone : ""}`}>
                {isDone ? <CheckIcon size={16} /> : step}
              </span>
              <span className={`${styles.label} ${isActive ? styles.labelActive : ""}`}>{label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
