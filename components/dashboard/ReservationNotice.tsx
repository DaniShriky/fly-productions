import { useEffect, useState } from "react";
import { REGISTRATION_URL } from "@/data/registration";
import { consumeJustLoggedIn } from "@/lib/justLoggedInFlag";
import { dismissReservationNotice } from "@/lib/queries/studioManagers";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { StudioManager } from "@/types/studioManager";
import { CloseIcon } from "./icons";
import styles from "./ReservationNotice.module.css";

// Step 1 ("שמירת מקום") used to be its own page in the stepper — see the
// deleted EarlyRegistrationStatus component. Dani asked to drop it as an
// in-site step and instead surface the same "go fill the external form"
// nudge as a popup — shown on every login, not every page refresh. The
// "just logged in" flag is set once, at the actual login action
// (pages/login.tsx), and consumed (read + cleared) here on mount, so a
// manager who reloads/revisits /dashboard without logging in again doesn't
// see it a second time.
//
// manager.reservationNoticeDismissed is a second, separate gate on top of
// that — a manager who's already filled the external form can say so once
// (the "כבר מילאתי" button below) and never see this again on any device,
// instead of it resurfacing on every future login indefinitely.
export default function ReservationNotice({ manager }: { manager: StudioManager }) {
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!manager.reservationNoticeDismissed && consumeJustLoggedIn()) setOpen(true);
  }, [manager.reservationNoticeDismissed]);

  function close() {
    setOpen(false);
  }

  async function handleAlreadyDone() {
    setDismissing(true);
    try {
      await dismissReservationNotice(supabaseBrowserClient, manager.id);
    } catch (err) {
      // Not worth a user-facing error here — worst case she sees the popup
      // again next login and can try "כבר מילאתי" once more then.
      console.error("Failed to persist reservation-notice dismissal:", err);
    } finally {
      setDismissing(false);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.card} role="dialog" aria-label="שמירת מקום בתחרויות" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="סגירה">
          <CloseIcon size={13} />
        </button>
        <div className={styles.emoji}>💌</div>
        <h2>רגע לפני שמתחילים</h2>
        <p>
          שמרתם מקום בתחרויות שלכם? זו הודעת עניין ראשונית, לא מחייבת וללא תשלום - טופס אחד שמכסה את כל התחרויות. אם
          כבר מילאתם, אפשר לדלג ישר להוספת הריקודים.
        </p>
        <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className={styles.cta} onClick={close}>
          מעבר לטופס שמירת המקום
        </a>
        <button type="button" className={styles.alreadyDoneBtn} onClick={handleAlreadyDone} disabled={dismissing}>
          כבר מילאתי, לא להראות שוב
        </button>
      </div>
    </div>
  );
}
