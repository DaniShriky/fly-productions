import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { CheckIcon, CloseIcon } from "./icons";
import styles from "./LiveNotifications.module.css";

type Toast = {
  id: string;
  message: string;
  variant: "success" | "neutral";
};

const AUTO_DISMISS_MS = 7000;

type RegistrationRealtimeRow = {
  id: string;
  payment_status?: "unpaid" | "paid";
  late_payment_exception?: boolean;
  dance_name?: string;
};
type StudioManagerRealtimeRow = {
  pending_preferred_competition_type?: string | null;
  preferred_competition_type?: string | null;
};

type Props = {
  managerId: string;
  // Keeps her own DanceEntriesTable in sync with whatever an admin just
  // changed (payment status, late-payment exception) — per Dani,
  // 2026-10-03, the popup alone wasn't enough if the table underneath it
  // still showed the old, now-wrong status until a manual refresh. Fires on
  // every update to one of her registrations, not just the ones that also
  // produce a toast (e.g. the exception flag alone changing still needs to
  // reach the table even though it doesn't get its own notification).
  onRegistrationUpdated?: (update: { id: string; paymentStatus: "unpaid" | "paid"; latePaymentException: boolean }) => void;
  // Same idea for her own studio_managers row — per Dani, 2026-10-03, seeing
  // the "אושרה ✓" toast while /profile's radio buttons and approval-note
  // text still showed the stale pre-approval state was the actual bug being
  // reported, not just a nice-to-have. Fires on every studio_managers
  // update to her row, same reasoning as onRegistrationUpdated above.
  onManagerUpdated?: (update: {
    preferredCompetitionType: string | null;
    pendingPreferredCompetitionType: string | null;
  }) => void;
};

// Popup toasts for admin actions that directly affect this manager — per
// Dani, 2026-10-03: a payment getting approved, or a competition-type
// request getting decided, should surface immediately if she has the
// dashboard open, not only be discoverable by noticing the change herself
// later. Compares each update's old vs new row (needs REPLICA IDENTITY FULL
// on both tables — see supabase/schema.sql Round 9) so an unrelated change
// — toggling a late-payment exception on an already-paid dance, saving an
// unrelated profile field — doesn't re-fire a stale notification.
export default function LiveNotifications({ managerId, onRegistrationUpdated, onManagerUpdated }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(message: string, variant: Toast["variant"]) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }

  function dismiss(id: string) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel(`manager-live-notifications-${managerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "registrations", filter: `studio_manager_id=eq.${managerId}` },
        (payload) => {
          const prev = payload.old as RegistrationRealtimeRow;
          const next = payload.new as RegistrationRealtimeRow;

          if (next.payment_status) {
            onRegistrationUpdated?.({
              id: next.id,
              paymentStatus: next.payment_status,
              latePaymentException: !!next.late_payment_exception,
            });
          }

          if (prev.payment_status !== "paid" && next.payment_status === "paid") {
            pushToast(`התשלום עבור "${next.dance_name}" אושר ✓`, "success");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "studio_managers", filter: `id=eq.${managerId}` },
        (payload) => {
          const prev = payload.old as StudioManagerRealtimeRow;
          const next = payload.new as StudioManagerRealtimeRow;

          onManagerUpdated?.({
            preferredCompetitionType: next.preferred_competition_type ?? null,
            pendingPreferredCompetitionType: next.pending_preferred_competition_type ?? null,
          });

          const wasPending = !!prev.pending_preferred_competition_type;
          const stillPending = !!next.pending_preferred_competition_type;
          if (!wasPending || stillPending) return;

          const approved = next.preferred_competition_type === prev.pending_preferred_competition_type;
          pushToast(
            approved
              ? `הבקשה שלך לשינוי לסוג תחרויות "${next.preferred_competition_type}" אושרה ✓`
              : "הבקשה שלך לשינוי סוג התחרויות נדחתה - לפרטים, צרו קשר איתנו.",
            approved ? "success" : "neutral"
          );
        }
      )
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRegistrationUpdated/
    // onManagerUpdated are deliberately excluded: callers pass
    // useCallback-stabilized functions (see pages/dashboard/index.tsx and
    // pages/profile/index.tsx), and including them here would only matter if
    // that stability contract were broken — re-subscribing the whole channel
    // on every render in the meantime would be worse.
  }, [managerId]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${t.variant === "success" ? styles.toastSuccess : ""}`}
          role="status"
        >
          {t.variant === "success" && (
            <span className={styles.icon}>
              <CheckIcon size={13} />
            </span>
          )}
          <span className={styles.message}>{t.message}</span>
          <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="סגירה">
            <CloseIcon size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
