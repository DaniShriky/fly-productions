import { CSSProperties } from "react";
import Image from "next/image";
import { AdminRegistration } from "@/lib/queries/adminRegistrations";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { hexToRgbParts } from "@/lib/hexToRgbParts";
import { CheckIcon } from "@/components/dashboard/icons";
import styles from "./AdminCompetitionStats.module.css";

// Same religious-pink override as RegistrationCutoffEditor.module.css's
// RELIGIOUS_ROW_COLOR — mega-star-religious otherwise shares mega-star's
// plain gold accentColor, which would make the two indistinguishable here
// too (this card strip is the same "color differentiation" request, applied
// to a different admin table).
const RELIGIOUS_CARD_COLOR = "#f582c2";

type Props = {
  competitions: CompetitionWithPricing[];
  registrations: AdminRegistration[];
  selectedId: string;
  onSelect: (id: string) => void;
};

// Replaces the old plain competition <select> — per Dani, 2026-10-08: she
// wanted both a clearer way to see orders per competition and basic
// per-competition analytics (dance/participant counts), with the same kind
// of color differentiation RegistrationCutoffEditor's rows already use
// (lib/competitionAccentColors.ts), not a generic dropdown. Deliberately
// always computed from the full `registrations` list (not the table's
// currently-filtered rows) — these cards are themselves a filter/navigation
// control, so their counts need to stay stable regardless of the paid/
// unpaid toggle or search text applied elsewhere on the page.
export default function AdminCompetitionStats({ competitions, registrations, selectedId, onSelect }: Props) {
  const cards = competitions
    .map((competition) => {
      const entries = registrations.filter((r) => r.competitionId === competition.id);
      return {
        competition,
        danceCount: entries.length,
        participantTotal: entries.reduce((sum, e) => sum + e.participantCount, 0),
        paidCount: entries.filter((e) => e.paymentStatus === "paid").length,
      };
    })
    .filter(({ danceCount }) => danceCount > 0);

  if (cards.length === 0) return null;

  function cardStyle(color?: string): CSSProperties | undefined {
    const rgb = color ? hexToRgbParts(color) : null;
    if (!rgb) return undefined;
    return {
      "--card-accent": color,
      "--card-rgb": `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    } as CSSProperties;
  }

  const totalParticipants = registrations.reduce((sum, e) => sum + e.participantCount, 0);
  const totalPaid = registrations.filter((e) => e.paymentStatus === "paid").length;

  return (
    <div className={styles.wrap}>
      <p className={styles.groupTitle}>הזמנות לפי תחרות</p>
      <div className={styles.grid}>
        <button
          type="button"
          className={`${styles.card} ${selectedId === "all" ? styles.cardActive : ""}`}
          onClick={() => onSelect("all")}
          aria-pressed={selectedId === "all"}
        >
          {selectedId === "all" && (
            <span className={styles.check}>
              <CheckIcon size={13} />
            </span>
          )}
          <span className={styles.logoSlot}>
            <Image src="/images/fly-logo.png" alt="" width={32} height={32} className={styles.logo} />
          </span>
          <span className={styles.name}>כל התחרויות</span>
          <span className={styles.heroStat}>{registrations.length} ריקודים</span>
          <span className={styles.subStat}>
            {totalParticipants} משתתפים · {totalPaid} שולם
          </span>
        </button>

        {cards.map(({ competition, danceCount, participantTotal, paidCount }) => {
          const active = selectedId === competition.id;
          const color = competition.isReligious ? RELIGIOUS_CARD_COLOR : competition.accentColor;
          return (
            <button
              key={competition.id}
              type="button"
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              style={cardStyle(color)}
              onClick={() => onSelect(competition.id)}
              aria-pressed={active}
            >
              {active && (
                <span className={styles.check}>
                  <CheckIcon size={13} />
                </span>
              )}
              <span className={styles.logoSlot}>
                {competition.logo && (
                  <Image src={competition.logo} alt="" width={44} height={38} className={styles.logo} />
                )}
              </span>
              <span className={`${styles.name} en`} lang="en">
                {competition.name}
              </span>
              <span className={styles.heroStat}>{danceCount} ריקודים</span>
              <span className={styles.subStat}>
                {participantTotal} משתתפים · {paidCount} שולם
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
