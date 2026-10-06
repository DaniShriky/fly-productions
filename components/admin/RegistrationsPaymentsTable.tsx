import { Fragment, useEffect, useState } from "react";
import { AdminRegistration, getAllRegistrationsForAdmin, updateRegistrationPaymentAdmin } from "@/lib/queries/adminRegistrations";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import {
  computePrice,
  computeRecordingFee,
  computeRecordingFeeForType,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
  formatPrice,
} from "@/lib/pricing";
import { ChevronDownIcon, EditIcon } from "@/components/dashboard/icons";
import AdminEditDanceModal from "./AdminEditDanceModal";
import styles from "./RegistrationsPaymentsTable.module.css";

type Filter = "all" | "unpaid" | "paid";

function shortLabel(label: string): string {
  return label.split(" (")[0];
}

function mediaOrdersLabel(entry: AdminRegistration): string {
  const parts = [entry.wantsVideo && "וידאו", entry.wantsStills && "סטילס"].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : "—";
}

type Props = {
  initialRegistrations: AdminRegistration[];
  competitions: CompetitionWithPricing[];
};

// Every dance any studio manager has entered, across every competition —
// the admin-side counterpart to the manager's own DanceEntriesTable. Dani
// specifically asked for this to replace manually tracking who paid via
// WhatsApp/bank statements: payment status and the late-payment exception
// flag are editable right here (see admin_update_registration_payment in
// supabase/schema.sql — a manager can never set these herself once a dance
// exists, by design).
export default function RegistrationsPaymentsTable({ initialRegistrations, competitions }: Props) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [filter, setFilter] = useState<Filter>("all");
  // "all" = no competition filter — a plain string (not null) so it works
  // directly as a <select> value without extra conversion.
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  // Per Dani, 2026-10-06: the price breakdown used to always be inline in
  // the מחיר cell — now it's collapsed by default (just the total shows)
  // and clicking the row opens an itemized breakdown row below it, same
  // base/surcharge/video/stills/total shape as DanceEntriesTable's own
  // footer breakdown.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Per Dani, 2026-10-06: lets an admin fix a dance's own details — most
  // importantly for an already-submitted dance, which the studio manager
  // herself can no longer edit at all.
  const [editingEntry, setEditingEntry] = useState<AdminRegistration | null>(null);

  // Live updates: a studio manager submitting (or an admin herself changing
  // payment status) should show up here immediately, not only on the next
  // page load — per Dani, 2026-10-03. Refetches the whole list on any
  // change rather than trying to merge the bare Postgres row from the
  // realtime payload, since this table needs the joined studio_managers/
  // competitions fields (phone, competition name) that payload doesn't
  // carry. Infrequent enough (studio submissions, admin edits) that the
  // extra round-trip per change is a non-issue.
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel("admin-registrations-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => {
        getAllRegistrationsForAdmin(supabaseBrowserClient)
          .then(setRegistrations)
          .catch((err) => console.error("Live registrations refresh failed:", err));
      })
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  const recordingFeeOf = (r: AdminRegistration) => computeRecordingFee(r.wantsVideo, r.wantsStills);

  const priceOf = (r: AdminRegistration) => {
    const competition = competitions.find((c) => c.id === r.competitionId);
    return competition
      ? computeTotalPrice(competition.priceTiers, r.category, r.participantCount, r.songDurationSeconds, recordingFeeOf(r))
      : null;
  };

  async function handleToggleStatus(r: AdminRegistration) {
    const nextStatus = r.paymentStatus === "paid" ? "unpaid" : "paid";
    setSavingId(r.id);
    try {
      await updateRegistrationPaymentAdmin(supabaseBrowserClient, r.id, nextStatus, r.latePaymentException);
      setRegistrations((current) => current.map((e) => (e.id === r.id ? { ...e, paymentStatus: nextStatus } : e)));
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleException(r: AdminRegistration, checked: boolean) {
    setSavingId(r.id);
    try {
      await updateRegistrationPaymentAdmin(supabaseBrowserClient, r.id, r.paymentStatus, checked);
      setRegistrations((current) => current.map((e) => (e.id === r.id ? { ...e, latePaymentException: checked } : e)));
    } finally {
      setSavingId(null);
    }
  }

  // Free-text, matched against every field a studio manager/dance could
  // reasonably be found by — not just studio name, per Dani, 2026-10-06
  // ("שם סטודיו לפי רצונה / מנהלת להקה וכו'"). Case/diacritic-insensitive
  // substring match, same simple approach as the rest of this codebase's
  // filtering (no fuzzy search library).
  const searchNormalized = search.trim().toLowerCase();
  const filtered = registrations.filter((r) => {
    if (filter !== "all" && r.paymentStatus !== filter) return false;
    if (competitionFilter !== "all" && r.competitionId !== competitionFilter) return false;
    if (searchNormalized) {
      const haystack = `${r.studioName} ${r.managerName} ${r.danceName} ${r.city} ${r.studioPhone}`.toLowerCase();
      if (!haystack.includes(searchNormalized)) return false;
    }
    return true;
  });

  if (registrations.length === 0) {
    return <p>עדיין לא נוספו ריקודים על ידי אף מנהלת.</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="חיפוש לפי סטודיו, מנהלת, ריקוד, יישוב או טלפון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.competitionSelect}
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
        >
          <option value="all">כל התחרויות</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filters}>
        {(["all", "unpaid", "paid"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterButton} ${filter === f ? styles.filterActive : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "הכל" : f === "unpaid" ? "טרם שולם" : "שולם"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.noResults}>לא נמצאו ריקודים התואמים לסינון.</p>
      ) : (
      <table className={styles.table}>
        <thead>
          <tr>
            <th>תחרות</th>
            <th>סטודיו</th>
            <th>ריקוד</th>
            <th>קטגוריה</th>
            <th>מדיה</th>
            <th>מחיר</th>
            <th>סטטוס תשלום</th>
            <th>חריג תשלום מאוחר</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const competition = competitions.find((c) => c.id === r.competitionId);
            const perParticipantPrice = competition ? computePrice(competition.priceTiers, r.category) : null;
            const price = priceOf(r);
            const isPaid = r.paymentStatus === "paid";
            const isExpanded = expandedId === r.id;
            // Corrected 2026-10-06 (Dani): every non-solo category is priced
            // per participant, not just the true "group" categories — see
            // computeTotalPrice's comment in lib/pricing.ts.
            const pricedPerParticipant = r.category !== "solo";
            const basePrice =
              perParticipantPrice != null ? perParticipantPrice * (pricedPerParticipant ? r.participantCount : 1) : null;
            const surcharge = computeSurcharge(r.category, r.songDurationSeconds, r.participantCount);
            const videoFee = r.wantsVideo ? computeRecordingFeeForType() : 0;
            const stillsFee = r.wantsStills ? computeRecordingFeeForType() : 0;

            return (
              <Fragment key={r.id}>
                <tr
                  className={styles.row}
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  aria-expanded={isExpanded}
                >
                  <td>
                    <span className="en" lang="en">
                      {r.competitionName}
                    </span>
                  </td>
                  <td>
                    {r.studioName}
                    {r.studioPhone && (
                      <div className={styles.subLine} dir="ltr">
                        {r.studioPhone}
                      </div>
                    )}
                  </td>
                  <td>
                    {r.danceName}
                    <div className={styles.subLine}>כוריאוגרף/ית: {r.choreographerName}</div>
                  </td>
                  <td>
                    {shortLabel(displayCategoryLabel(r.category, r.participantCount))} · {r.participantCount} · רמה{" "}
                    {r.danceLevel}
                  </td>
                  <td>{mediaOrdersLabel(r)}</td>
                  <td>
                    {price == null ? (
                      "—"
                    ) : (
                      <span className={styles.priceCell}>
                        <span className={styles.price}>{formatPrice(price)}₪</span>
                        <span className={`${styles.expandChevron} ${isExpanded ? styles.expandChevronOpen : ""}`}>
                          <ChevronDownIcon size={14} />
                        </span>
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`${styles.statusButton} ${isPaid ? styles.statusPaid : styles.statusUnpaid}`}
                      disabled={savingId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(r);
                      }}
                    >
                      {isPaid ? "שולם" : "טרם שולם"}
                    </button>
                  </td>
                  <td>
                    <label className={styles.exceptionLabel} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={r.latePaymentException}
                        disabled={savingId === r.id}
                        onChange={(e) => handleToggleException(r, e.target.checked)}
                      />
                      מאושר לחרוג
                    </label>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.editButton}
                      title="עריכת ריקוד"
                      aria-label="עריכת ריקוד"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEntry(r);
                      }}
                    >
                      <EditIcon size={15} />
                    </button>
                  </td>
                </tr>
                {isExpanded && price != null && (
                  <tr className={styles.breakdownRow}>
                    <td colSpan={9}>
                      <div className={styles.breakdown}>
                        {basePrice != null && (
                          <div className={styles.breakdownLine}>
                            <span>
                              מחיר בסיס
                              {pricedPerParticipant && perParticipantPrice != null
                                ? ` (${formatPrice(perParticipantPrice)}₪ × ${r.participantCount} משתתפים)`
                                : ""}
                            </span>
                            <span>{formatPrice(basePrice)}₪</span>
                          </div>
                        )}
                        {surcharge > 0 && (
                          <div className={styles.breakdownLine}>
                            <span>תוספת חריגת זמן בשיר</span>
                            <span>{formatPrice(surcharge)}₪</span>
                          </div>
                        )}
                        {videoFee > 0 && (
                          <div className={styles.breakdownLine}>
                            <span>צילום וידאו</span>
                            <span>{formatPrice(videoFee)}₪</span>
                          </div>
                        )}
                        {stillsFee > 0 && (
                          <div className={styles.breakdownLine}>
                            <span>צילום סטילס</span>
                            <span>{formatPrice(stillsFee)}₪</span>
                          </div>
                        )}
                        <div className={`${styles.breakdownLine} ${styles.breakdownTotal}`}>
                          <span>סה&quot;כ</span>
                          <span>{formatPrice(price)}₪</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      )}

      {editingEntry && (
        <AdminEditDanceModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated) => {
            setRegistrations((current) => current.map((e) => (e.id === updated.id ? updated : e)));
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}
