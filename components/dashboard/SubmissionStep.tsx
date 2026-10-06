import { useEffect, useState } from "react";
import { Registration } from "@/types/registration";
import { PHONE, WHATSAPP_URL } from "@/lib/contact";
import { CloseIcon, MinusIcon, PlusIcon } from "./icons";
import styles from "./SubmissionStep.module.css";

type MediaConsent = "consented" | "declined";

type Props = {
  entries: Registration[];
  onSubmit: (acceptedTerms: boolean, mediaConsent: MediaConsent, totalParticipantCount: number) => Promise<void>;
};

// The popup shown right after a successful הגשה — same overlay/card/
// Escape-to-close pattern as ReservationNotice.tsx, duplicated rather than
// shared (not a reusable component in this codebase yet). Explains that
// payment itself is still handled manually (no Grow/PayPlus integration
// yet — see project_product_vision/docs/ARCHITECTURE.md phases), using the
// same PHONE/WHATSAPP_URL DanceEntriesTable already surfaces elsewhere.
function ManualPaymentPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} role="dialog" aria-label="ההגשה התקבלה" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="סגירה">
          <CloseIcon size={13} />
        </button>
        <div className={styles.emoji}>✅</div>
        <h2>ההגשה התקבלה!</h2>
        <p>
          הפרטים נשלחו אלינו בהצלחה. שימו לב - התשלום מתבצע כרגע באופן ידני, לא דרך האתר. ניצור איתכם קשר לתיאום
          התשלום בהקדם.
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.cta}>
          לשאלות, אפשר גם לפנות אלינו בוואטסאפ ({PHONE})
        </a>
      </div>
    </div>
  );
}

// Step 3: the final, explicit confirmation moment — per Dani (2026-10-03),
// before now a registration never really "ended." Submitting locks every
// currently-draft dance from further editing and is the first time it
// becomes visible to the admin dashboard at all (see submit_registrations()
// in supabase/schema.sql). A manager can still add more dances afterward;
// those start as fresh drafts needing their own later הגשה, which is why
// this only ever acts on entries without a submittedAt yet.
export default function SubmissionStep({ entries, onSubmit }: Props) {
  const draftEntries = entries.filter((e) => !e.submittedAt);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Per Dani, 2026-10-06: a manager shouldn't be able to approve the
  // תקנון without having actually opened it at least once first — tracked
  // purely client-side (opening the link in a new tab doesn't prove she
  // read it, but it's the honest-effort signal available here).
  const [hasViewedTakanon, setHasViewedTakanon] = useState(false);
  const [mediaConsent, setMediaConsent] = useState<MediaConsent | "">("");
  // Free text, not number, so the field can be genuinely empty while typing
  // instead of snapping to 0 — parsed/validated below. Self-reported, not
  // derived from summing entries' participantCount: a dancer performing in
  // several numbers would get double-counted that way, and this question is
  // asking for the studio's actual total headcount (per Dani, 2026-10-05).
  const [totalParticipantCount, setTotalParticipantCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const parsedParticipantCount = Number(totalParticipantCount);
  const participantCountValid = totalParticipantCount.trim() !== "" && Number.isInteger(parsedParticipantCount) && parsedParticipantCount > 0;
  const canSubmit = acceptedTerms && mediaConsent !== "" && participantCountValid;

  // Same +/- stepper behavior as DanceEntryForm's participant-count field —
  // floors at 1, and the first click from an empty field lands on 1.
  function adjustTotalParticipantCount(delta: number) {
    setTotalParticipantCount((prev) => String(Math.max(1, (Number(prev) || 0) + delta)));
  }

  function handleAcceptTermsClick() {
    if (!hasViewedTakanon) {
      alert("לפני אישור התקנון יש לצפות בו - לחצו על \"תקנון הפסטיבל\" למעלה כדי לפתוח אותו.");
      return;
    }
    setAcceptedTerms(true);
  }

  async function handleSubmitClick() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(acceptedTerms, mediaConsent as MediaConsent, parsedParticipantCount);
      setJustSubmitted(true);
    } catch (err) {
      console.error("Registration submission failed:", err);
      setSubmitError("ההגשה נכשלה - נסו שוב, ואם זה ממשיך לקרות צרו איתנו קשר.");
    } finally {
      setSubmitting(false);
    }
  }

  // `justSubmitted` is checked independently below, not folded into this
  // condition — handleSubmitClick's onSubmit optimistically marks entries as
  // submitted in the parent, so draftEntries goes to 0 on the very next
  // render after a successful submit. If the empty-state return above also
  // covered that case, the success popup would never actually get a chance
  // to render — it'd be replaced by the empty message in the same tick.
  const hasDrafts = draftEntries.length > 0;

  return (
    <>
      {hasDrafts ? (
        <>
          <div className={styles.questionCard}>
            <p className={styles.question}>
              קראתי את{" "}
              <a
                href="/documents/takanon.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.takanonLink}
                onClick={() => setHasViewedTakanon(true)}
              >
                תקנון הפסטיבל
              </a>{" "}
              ואני מאשר/ת את השתתפותנו בהתאם לכללי התקנון <span className={styles.required}>*</span>
            </p>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="accepted-terms"
                checked={acceptedTerms}
                onChange={handleAcceptTermsClick}
              />
              מאשר/ת
            </label>
          </div>

          <div className={styles.questionCard}>
            <p className={styles.question}>
              אני מאשר/ת פרסום של תמונות/סרטונים שלנו בכל סוגי המדיה <span className={styles.required}>*</span>
            </p>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="media-consent"
                checked={mediaConsent === "consented"}
                onChange={() => setMediaConsent("consented")}
              />
              מאשר/ת
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="media-consent"
                checked={mediaConsent === "declined"}
                onChange={() => setMediaConsent("declined")}
              />
              לא מאשר/ת
            </label>
          </div>

          <div className={styles.questionCard}>
            <p className={styles.question}>
              מה מספר המשתתפים מהסטודיו שלכם בסה&quot;כ? <span className={styles.required}>*</span>
            </p>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => adjustTotalParticipantCount(-1)}
                disabled={parsedParticipantCount <= 1}
                aria-label="הפחתת משתתף"
              >
                <MinusIcon size={16} />
              </button>
              <input
                type="number"
                min={1}
                className={styles.stepperInput}
                value={totalParticipantCount}
                onChange={(e) => setTotalParticipantCount(e.target.value)}
              />
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => adjustTotalParticipantCount(1)}
                aria-label="הוספת משתתף"
              >
                <PlusIcon size={16} />
              </button>
            </div>
          </div>

          <p className={styles.reviewNote}>עברתי על כל הפרטים שמילאתי בטבלת הסיכום למעלה ואני מאשר/ת שהם נכונים.</p>

          {submitError && <p className={styles.submitError}>{submitError}</p>}

          <div className={styles.submitRow}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmitClick}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "שולחת..." : "הגשה"}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.questionCard}>
          <p className={styles.emptyText}>
            {entries.length === 0
              ? "עדיין לא נוספו ריקודים - אפשר לחזור לשלב 1 כדי להוסיף."
              : "אין ריקודים חדשים להגשה - כל הריקודים שנוספו כבר הוגשו. הוספתם ריקוד נוסף? הוא יופיע כאן להגשה."}
          </p>
        </div>
      )}

      {justSubmitted && <ManualPaymentPopup onClose={() => setJustSubmitted(false)} />}
    </>
  );
}
