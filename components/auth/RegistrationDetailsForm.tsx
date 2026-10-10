import { FormEvent, useState } from "react";
import CityAutocomplete from "@/components/shared/CityAutocomplete";
import styles from "./RegistrationDetailsForm.module.css";

export type RegistrationDetails = {
  studioName: string;
  managerName: string;
  phone: string;
  city: string;
  referralSource: string;
  preferredCompetitionType: "regular" | "religious" | "both";
};

type Props = {
  onSubmit: (details: RegistrationDetails) => void;
  // Re-shown after going "back" from the email-verification step — without
  // this, going back to fix a typo meant losing everything already typed.
  initialValues?: RegistrationDetails;
};

// Fields match the site's real, already-live registration Google Form
// (fetched directly from forms.gle/XyvWwyQ5KM2crzueA) — studioName/phone were
// already here from the original Phase 3 draft; managerName/city were added
// once the real form's fields were checked. danceStyles and
// wantsStageServicesInfo were dropped from registration (2026-10-02, Dani) —
// still collectible later from /profile if she wants them back here too.
export default function RegistrationDetailsForm({ onSubmit, initialValues }: Props) {
  const [studioName, setStudioName] = useState(initialValues?.studioName ?? "");
  const [managerName, setManagerName] = useState(initialValues?.managerName ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  // Starts genuinely empty, not defaulted to some first option — a manager
  // who didn't notice the field had already picked something for her would
  // otherwise submit the wrong city without ever touching it. `required`
  // below forces a real, deliberate entry instead.
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [referralSource, setReferralSource] = useState(initialValues?.referralSource ?? "");
  const [preferredCompetitionType, setPreferredCompetitionType] = useState<"regular" | "religious" | "both">(
    initialValues?.preferredCompetitionType ?? "regular"
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      studioName,
      managerName,
      phone,
      city,
      referralSource,
      preferredCompetitionType,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.optionalHint}>
        <span className={styles.required}>*</span> שדה חובה
      </p>

      <label className={styles.field}>
        <span>
          שם הסטודיו/הלהקה <span className={styles.required}>*</span>
        </span>
        <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>
          שם מנהל/ת הלהקה <span className={styles.required}>*</span>
        </span>
        <input required value={managerName} onChange={(e) => setManagerName(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>
          טלפון נייד <span className={styles.required}>*</span>
        </span>
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
        <span>
          יישוב <span className={styles.required}>*</span>
        </span>
        <CityAutocomplete required value={city} onChange={setCity} />
      </label>

      <label className={styles.field}>
        <span>מאיפה שמעתם עלינו?</span>
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
          חילוני
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={preferredCompetitionType === "religious"}
            onChange={() => setPreferredCompetitionType("religious")}
          />
          מגזר דתי
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="preferredCompetitionType"
            checked={preferredCompetitionType === "both"}
            onChange={() => setPreferredCompetitionType("both")}
          />
          שניהם
        </label>
      </fieldset>

      <button type="submit" className={styles.submit}>
        המשך
      </button>
    </form>
  );
}
