import { FormEvent, useState } from "react";
import { ISRAELI_CITIES } from "@/lib/cities";
import styles from "./RegistrationDetailsForm.module.css";

const OTHER_CITY = "אחר";

export type RegistrationDetails = {
  studioName: string;
  managerName: string;
  phone: string;
  city: string;
  danceStyles: string;
  referralSource: string;
  preferredCompetitionType: "regular" | "religious";
  wantsStageServicesInfo: boolean;
};

type Props = {
  onSubmit: (details: RegistrationDetails) => void;
};

// Fields match the site's real, already-live registration Google Form
// (fetched directly from forms.gle/XyvWwyQ5KM2crzueA) — studioName/phone were
// already here from the original Phase 3 draft; managerName/city/danceStyles/
// wantsStageServicesInfo were added once the real form's fields were checked.
export default function RegistrationDetailsForm({ onSubmit }: Props) {
  const [studioName, setStudioName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(ISRAELI_CITIES[0]);
  const [customCity, setCustomCity] = useState("");
  const [danceStyles, setDanceStyles] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [preferredCompetitionType, setPreferredCompetitionType] = useState<"regular" | "religious">("regular");
  const [wantsStageServicesInfo, setWantsStageServicesInfo] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      studioName,
      managerName,
      phone,
      city: city === OTHER_CITY ? customCity : city,
      danceStyles,
      referralSource,
      preferredCompetitionType,
      wantsStageServicesInfo,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>שם הסטודיו/הלהקה</span>
        <input required value={studioName} onChange={(e) => setStudioName(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>שם מנהל/ת הלהקה</span>
        <input required value={managerName} onChange={(e) => setManagerName(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span>טלפון נייד</span>
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
        <span>יישוב</span>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {ISRAELI_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OTHER_CITY}>{OTHER_CITY}</option>
        </select>
      </label>

      {city === OTHER_CITY && (
        <label className={styles.field}>
          <span>איזה יישוב?</span>
          <input required value={customCity} onChange={(e) => setCustomCity(e.target.value)} />
        </label>
      )}

      <label className={styles.field}>
        <span>סגנונות ריקוד (לא חובה)</span>
        <input value={danceStyles} onChange={(e) => setDanceStyles(e.target.value)} />
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

      <label className={styles.radio}>
        <input
          type="checkbox"
          checked={wantsStageServicesInfo}
          onChange={(e) => setWantsStageServicesInfo(e.target.checked)}
        />
        מעוניינת לקבל מידע על שירותי במה מקצועיים
      </label>

      <button type="submit" className={styles.submit}>
        המשך
      </button>
    </form>
  );
}
