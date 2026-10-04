import { useEffect, useState } from "react";
import { AdminRegistration, getAllRegistrationsForAdmin, updateRegistrationPaymentAdmin } from "@/lib/queries/adminRegistrations";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { computePrice, computeRecordingFee, computeTotalPrice, displayCategoryLabel, formatPrice } from "@/lib/pricing";
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
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const filtered = registrations.filter((r) => filter === "all" || r.paymentStatus === filter);

  if (registrations.length === 0) {
    return <p>עדיין לא נוספו ריקודים על ידי אף מנהלת.</p>;
  }

  return (
    <div className={styles.wrap}>
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
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const perParticipantPrice = (() => {
              const competition = competitions.find((c) => c.id === r.competitionId);
              return competition ? computePrice(competition.priceTiers, r.category) : null;
            })();
            const price = priceOf(r);
            const isPaid = r.paymentStatus === "paid";

            return (
              <tr key={r.id}>
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
                    <>
                      <span className={styles.price}>{formatPrice(price)}₪</span>
                      {perParticipantPrice != null && r.participantCount > 1 && (
                        <div className={styles.subLine}>({formatPrice(perParticipantPrice)}₪ / משתתף)</div>
                      )}
                    </>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className={`${styles.statusButton} ${isPaid ? styles.statusPaid : styles.statusUnpaid}`}
                    disabled={savingId === r.id}
                    onClick={() => handleToggleStatus(r)}
                  >
                    {isPaid ? "שולם" : "טרם שולם"}
                  </button>
                </td>
                <td>
                  <label className={styles.exceptionLabel}>
                    <input
                      type="checkbox"
                      checked={r.latePaymentException}
                      disabled={savingId === r.id}
                      onChange={(e) => handleToggleException(r, e.target.checked)}
                    />
                    מאושר לחרוג
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
