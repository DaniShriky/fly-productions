import { useEffect, useState } from "react";
import { FaChevronDown, FaMoneyBillWave } from "react-icons/fa";
import { getOwnStudioManager } from "@/lib/queries/studioManagers";
import { CompetitionWithPricing, getCompetitionsWithPricing } from "@/lib/queries/competitionsWithPricing";
import { PriceTiers } from "@/types/priceTiers";
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

// One sector's collapsible price card — own open/closed state, so two of
// these (secular + religious, for a "שניהם" manager) expand independently.
// Styled as the same dark card + gold icon-badge language as
// TakanonSection.tsx right above it on the homepage — per Dani, 2026-10-09,
// an earlier version modeled directly on her reference flyers (gold/pink
// poster-style pill bars) didn't feel like it belonged on the actual page.
function SectorPriceList({ isReligious, tiers }: { isReligious: boolean; tiers: PriceTiers }) {
  const [open, setOpen] = useState(false);
  const recordingFee = computeRecordingFeeForType();
  const perParticipant = isReligious ? "למשתתפת" : "למשתתף";
  const peopleWord = isReligious ? "משתתפות" : "משתתפים";

  return (
    <div className={`${styles.card} ${isReligious ? styles.religious : ""}`}>
      <button type="button" className={styles.header} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={styles.iconBadge} aria-hidden="true">
          <FaMoneyBillWave size={22} />
        </span>
        <span className={styles.text}>
          <h3>מחירון {isReligious ? "התחרות - מגזר דתי" : "התחרות"}</h3>
          <p>דמי השתתפות, כרטיסים וצילום - כל המחירים במקום אחד</p>
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          <FaChevronDown size={16} />
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.group}>
            <p className={styles.groupTitle}>דמי השתתפות</p>

            {!isReligious && <p className={styles.subLabel}>קבוצות מעל 11 {peopleWord}</p>}
            <div className={styles.row}>
              <span>{isReligious ? "קבוצה גדולה" : "עד חודשיים לפני האירוע (הרשמה מוקדמת)"}</span>
              <span className={styles.price}>
                {formatPrice(tiers.groupLarge.earlyPrice)} ₪ {perParticipant}
              </span>
            </div>
            {!isReligious && (
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupLarge.regularPrice)} ₪ {perParticipant}
                </span>
              </div>
            )}

            {!isReligious && <p className={styles.subLabel}>קבוצות של 10-5 {peopleWord}</p>}
            <div className={styles.row}>
              <span>{isReligious ? "קבוצה קטנה" : "עד חודשיים לפני האירוע (הרשמה מוקדמת)"}</span>
              <span className={styles.price}>
                {formatPrice(tiers.groupSmall.earlyPrice)} ₪ {perParticipant}
              </span>
            </div>
            {!isReligious && (
              <div className={styles.row}>
                <span>עד סיום ההרשמה (כחודש וחצי לפני התחרות)</span>
                <span className={styles.price}>
                  {formatPrice(tiers.groupSmall.regularPrice)} ₪ {perParticipant}
                </span>
              </div>
            )}
          </div>

          <div className={styles.group}>
            <p className={styles.groupTitle}>{isReligious ? "קטגוריות" : "קטגוריות קטנות"}</p>
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

          <div className={styles.group}>
            <p className={styles.groupTitle}>וידאו וסטילס</p>
            <div className={styles.row}>
              <span>וידאו (פר ריקוד)</span>
              <span className={styles.price}>{formatPrice(recordingFee)} ₪</span>
            </div>
            <div className={styles.row}>
              <span>סטילס (פר ריקוד)</span>
              <span className={styles.price}>{formatPrice(recordingFee)} ₪</span>
            </div>
          </div>

          <div className={styles.group}>
            <p className={styles.groupTitle}>כרטיסי כניסה</p>
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
      )}
    </div>
  );
}

// Only ever shown to a logged-in, approved studio manager — per Dani,
// 2026-10-09: the same homepage area as TakanonSection should also surface
// the price list relevant to HER sector(s), as collapsible card(s). Mirrors
// Nav.tsx's exact session-check pattern (getSession on mount +
// onAuthStateChange subscription) — the only other place on a public page
// that already needs to know who's signed in.
export default function PriceListSection() {
  const [managerType, setManagerType] = useState<string | undefined>(undefined);
  const [approved, setApproved] = useState(false);
  const [competitions, setCompetitions] = useState<CompetitionWithPricing[] | null>(null);

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

  // "שניהם" shows both price lists — per Dani, 2026-10-09. Anything else
  // (an exact "מגזר דתי" match, or anything that isn't, including unset)
  // keeps the same single-sector fallback-to-secular rule used everywhere
  // else this field is read (e.g. Step2FinalRegistration.tsx).
  const sectors: boolean[] = managerType === "שניהם" ? [false, true] : [managerType === "מגזר דתי"];

  const lists = sectors
    .map((isReligious) => ({
      isReligious,
      tiers: competitions.find((c) => c.isReligious === isReligious && c.priceTiers)?.priceTiers,
    }))
    .filter((l): l is { isReligious: boolean; tiers: PriceTiers } => !!l.tiers);

  if (lists.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.stack}>
        {lists.map((l) => (
          <SectorPriceList key={String(l.isReligious)} isReligious={l.isReligious} tiers={l.tiers} />
        ))}
      </div>
    </section>
  );
}
