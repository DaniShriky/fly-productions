import { useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { computeRecordingFeeForType, formatPrice } from "@/lib/pricing";
import styles from "./PriceListSection.module.css";

// Audience-ticket pricing has no column in competitions.price_tiers (that
// jsonb only models the participation-fee categories — see
// lib/queries/competitionsWithPricing.ts) — there's nothing live to pull
// this from, so these are taken directly from the two reference price lists
// Dani sent 2026-10-09. Update by hand here if these ever change for real.
const AUDIENCE_TICKET = {
  secular: { early: 75, regular: 85 },
  religious: { price: 70 },
};

// Only ever shown to a logged-in, approved studio manager — per Dani,
// 2026-10-09: the same homepage area as TakanonSection should also surface
// the price list relevant to HER sector (secular/religious), as a
// collapsible tab. Mirrors Nav.tsx's exact session-check pattern (getSession
// on mount + onAuthStateChange subscription) — the only other place on a
// public page that already needs to know who's signed in.
export default function PriceListSection() {
  const [managerType, setManagerType] = useState<string | undefined>(undefined);
  const [approved, setApproved] = useState(false);
  const [competitions, setCompetitions] = useState<CompetitionWithPricing[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function syncSession(session: { user: { id: string } } | null) {
      if (!session) {
        setApproved(false);
        setManagerType(undefined);
        setCompetitions(null);
        return;
      }
      const manager = await getOwnStudioManager(supabaseBrowserClient, session.user.id).catch(() => null);
      if (manager?.status !== "approved") {
        setApproved(false);
        return;
      }
      setApproved(true);
      setManagerType(manager.preferredCompetitionType);
      getCompetitionsWithPricing(supabaseBrowserClient)
        .then(setCompetitions)
        .catch(() => setCompetitions(null));
    }

    supabaseBrowserClient.auth.getSession().then(({ data: { session } }) => syncSession(session));
    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => syncSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!approved || !competitions) return null;

  // Same fallback-to-secular rule used everywhere else this field is read
  // (e.g. Step2FinalRegistration.tsx) — "שניהם" and an unset preference both
  // land on secular here too; only an exact "מגזר דתי" match shows religious.
  const isReligious = managerType === "מגזר דתי";
  const competition = competitions.find((c) => c.isReligious === isReligious && c.priceTiers);
  if (!competition?.priceTiers) return null;

  const tiers = competition.priceTiers;
  const recordingFee = computeRecordingFeeForType();
  const perParticipant = isReligious ? "למשתתפת" : "למשתתף";
  const peopleWord = isReligious ? "משתתפות" : "משתתפים";

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={`${styles.toggle} ${isReligious ? styles.religious : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>מחירון {isReligious ? "התחרות - מגזר דתי" : "התחרות"}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          <FaChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div className={`${styles.card} ${isReligious ? styles.religious : ""}`}>
          <h3 className={styles.cardTitle}>{isReligious ? "מחירון תחרויות - למגזר הדתי" : "מחירון תחרות הריקוד"}</h3>

          <div className={styles.group}>
            <p className={styles.groupTitle}>דמי השתתפות</p>

            <div className={styles.block}>
              <p className={styles.blockTitle}>קבוצות מעל 11 {peopleWord}</p>
              <div className={styles.row}>
                <span>עד חודשיים לפני האירוע (הרשמה מוקדמת)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupLarge.earlyPrice)} ₪ {perParticipant}
                </span>
              </div>
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupLarge.regularPrice)} ₪ {perParticipant}
                </span>
              </div>
            </div>

            <div className={styles.block}>
              <p className={styles.blockTitle}>קבוצות של 10-5 {peopleWord}</p>
              <div className={styles.row}>
                <span>עד חודשיים לפני האירוע (הרשמה מוקדמת)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupSmall.earlyPrice)} ₪ {perParticipant}
                </span>
              </div>
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupSmall.regularPrice)} ₪ {perParticipant}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.group}>
            <p className={styles.groupTitle}>קטגוריות קטנות</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>סולו</span>
                <span className={styles.price}>{formatPrice(tiers.solo.price)} ₪</span>
              </div>
              <div className={styles.row}>
                <span>דואט</span>
                <span className={styles.price}>
                  {formatPrice(tiers.duet.price)} ₪ {perParticipant}
                </span>
              </div>
              <div className={styles.row}>
                <span>טריו / קוורטט</span>
                <span className={styles.price}>
                  {formatPrice(tiers.trioQuartet.price)} ₪ {perParticipant}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.group}>
            <p className={styles.groupTitle}>וידאו וסטילס</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>וידאו (פר ריקוד)</span>
                <span className={styles.price}>{formatPrice(recordingFee)} ₪</span>
              </div>
              <div className={styles.row}>
                <span>סטילס (פר ריקוד)</span>
                <span className={styles.price}>{formatPrice(recordingFee)} ₪</span>
              </div>
            </div>
          </div>

          <div className={styles.group}>
            <p className={styles.groupTitle}>כרטיסי כניסה</p>
            <div className={styles.block}>
              {isReligious ? (
                <div className={styles.row}>
                  <span>מחיר כרטיס</span>
                  <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.religious.price)} ₪</span>
                </div>
              ) : (
                <>
                  <div className={styles.row}>
                    <span>עד 10 ימים לפני האירוע</span>
                    <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.secular.early)} ₪</span>
                  </div>
                  <div className={styles.row}>
                    <span>לאחר מכן</span>
                    <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.secular.regular)} ₪</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
