import { FormEvent, useState } from "react";
import styles from "./RegistrationDetailsForm.module.css";

export type RegistrationDetails = {
  studioName: string;
  phone: string;
  referralSource: string;
  preferredCompetitionType: "regular" | "religious";
};

type Props = {
  onSubmit: (details: RegistrationDetails) => void;
};

export default function RegistrationDetailsForm({ onSubmit }: Props) {
  const [studioName, setStudioName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [preferredCompetitionType, setPreferredCompetitionType] = useState<"regular" | "religious">("regular");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ studioName, phone, referralSource, preferredCompetitionType });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>שם הסטודיו/הלהקה</span>
        <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>טלפון</span>
        <input
          type="tel"
          dir="ltr"
          className="en"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </label>

      <label className={styles.field}>
        <span>מאיפה שמעת עלינו? (לא חובה)</span>
        <input value={referralSource} onChange={(e) => setReferralSource(e.target.value)} />
      </label>

      <fieldset className={styles.radioGroup}>
        <legend>סוג התחרויות המועדף</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={preferredCompetitionType === "regular"}
            onChange={() => setPreferredCompetitionType("regular")}
          />
          רגיל
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={preferredCompetitionType === "religious"}
            onChange={() => setPreferredCompetitionType("religious")}
          />
          דתי
        </label>
      </fieldset>

      <button type="submit" className={styles.submit}>
        המשך
      </button>
    </form>
  );
}
