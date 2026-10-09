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

      {open &&
        (isReligious ? (
          // Exact structure of the religious reference flyer: flatter than
          // the secular one (no early/regular date-tiered rows, no nested
          // subsection bars) — per Dani, 2026-10-09, this isn't a stylistic
          // choice of mine, it's what her actual flyer shows, so it's
          // replicated as-is rather than "evened out" to match the secular
          // layout's extra tiers.
          <div className={`${styles.frame} ${styles.religious}`}>
            <p className={styles.titleBar}>מחירון תחרויות</p>
            <p className={styles.subtitleBar}>למגזר הדתי - נשים</p>

            <p className={styles.sectionBar}>דמי השתתפות</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>קבוצה גדולה</span>
                <span className={styles.price}>{formatPrice(tiers.groupLarge.earlyPrice)} ₪ למשתתפת</span>
              </div>
              <div className={styles.row}>
                <span>קבוצה קטנה</span>
                <span className={styles.price}>{formatPrice(tiers.groupSmall.earlyPrice)} ₪ למשתתפת</span>
              </div>
            </div>

            <p className={styles.sectionBar}>קטגוריות</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>סולו</span>
                <span className={styles.price}>{formatPrice(tiers.solo.price)} ₪</span>
              </div>
              <div className={styles.row}>
                <span>דואט</span>
                <span className={styles.price}>{formatPrice(tiers.duet.price)} ₪ למשתתפת</span>
              </div>
              <div className={styles.row}>
                <span>טריו / קוורטט</span>
                <span className={styles.price}>{formatPrice(tiers.trioQuartet.price)} ₪ למשתתפת</span>
              </div>
            </div>

            <p className={styles.sectionBar}>וידאו וסטילס</p>
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

            <p className={styles.sectionBar}>כרטיסי כניסה</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span />
                <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.religious.price)} ₪</span>
              </div>
            </div>
          </div>
        ) : (
          // Exact structure of the secular reference flyer: gold section
          // bars (דמי השתתפות / כרטיסי כניסה / וידאו וסטילס) each either
          // containing black subsection bars (the two group-size tiers) or
          // standing alone (קטגוריות קטנות, sized the same as a subsection
          // bar but with no gold parent header above it, matching the image).
          <div className={styles.frame}>
            <p className={styles.titleBar}>מחירון תחרות הריקוד</p>

            <p className={styles.sectionBar}>דמי השתתפות</p>

            <p className={styles.subBar}>קבוצות מעל 11 משתתפים</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>עד חודשיים לפני האירוע (הרשמה מוקדמת)</span>
                <span className={styles.price}>{formatPrice(tiers.groupLarge.earlyPrice)} ₪ למשתתף</span>
              </div>
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>{formatPrice(tiers.groupLarge.regularPrice)} ₪ למשתתף</span>
              </div>
            </div>

            <p className={styles.subBar}>קבוצות של 10-5 משתתפים</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>עד חודשיים לפני האירוע (הרשמה מוקדמת)</span>
                <span className={styles.price}>{formatPrice(tiers.groupSmall.earlyPrice)} ₪ למשתתף</span>
              </div>
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>{formatPrice(tiers.groupSmall.regularPrice)} ₪ למשתתף</span>
              </div>
            </div>

            <p className={styles.subBar}>קטגוריות קטנות</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>סולו</span>
                <span className={styles.price}>{formatPrice(tiers.solo.price)} ₪</span>
              </div>
              <div className={styles.row}>
                <span>דואט</span>
                <span className={styles.price}>{formatPrice(tiers.duet.price)} ₪ למשתתף</span>
              </div>
              <div className={styles.row}>
                <span>טריו / קוורטט</span>
                <span className={styles.price}>{formatPrice(tiers.trioQuartet.price)} ₪ למשתתף</span>
              </div>
            </div>

            <p className={styles.sectionBar}>כרטיסי כניסה</p>
            <div className={styles.block}>
              <div className={styles.row}>
                <span>עד 10 ימים לפני האירוע</span>
                <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.secular.early)} ₪</span>
              </div>
              <div className={styles.row}>
                <span>לאחר מכן</span>
                <span className={styles.price}>{formatPrice(AUDIENCE_TICKET.secular.regular)} ₪</span>
              </div>
            </div>

            <p className={styles.sectionBar}>וידאו וסטילס</p>
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
        ))}
    </section>
  );
}
