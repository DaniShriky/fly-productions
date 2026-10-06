import { useEffect, useState } from "react";
import { StudioManager } from "@/types/studioManager";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getPendingCompetitionTypeRequests, resolveCompetitionTypeRequest } from "@/lib/queries/studioManagers";
import { errorDetail } from "@/lib/errorDetail";
import styles from "./PendingApprovalsTable.module.css";

// Managers can't change preferred_competition_type themselves anymore (see
// supabase/schema.sql) — requests land here instead, since religious
// competitions have different pricing/rules and Dani wants that switch
// reviewed rather than self-served.
export default function CompetitionTypeRequestsTable({ initialManagers }: { initialManagers: StudioManager[] }) {
  const [managers, setManagers] = useState(initialManagers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // See the matching fix in PendingApprovalsTable.tsx — this had the same
  // no-catch silent-failure bug.
  const [actionError, setActionError] = useState<string | null>(null);

  // A new request should appear here live — per Dani, 2026-10-03. Same
  // refetch-on-any-change approach as PendingApprovalsTable, for the same
  // reason (the query's own filter — a non-null pending_preferred_
  // competition_type — can't be evaluated from the bare realtime payload).
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel("admin-competition-type-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_managers" }, () => {
        getPendingCompetitionTypeRequests(supabaseBrowserClient)
          .then(setManagers)
          .catch((err) => console.error("Live competition-type-requests refresh failed:", err));
      })
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  async function handleDecision(id: string, approve: boolean) {
    setPendingId(id);
    setActionError(null);
    try {
      await resolveCompetitionTypeRequest(supabaseBrowserClient, id, approve);
      setManagers((current) => current.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Competition-type request approval/rejection failed:", err);
      const detail = errorDetail(err);
      setActionError(`הפעולה נכשלה - נסו שוב.${detail ? ` (${detail})` : ""}`);
    } finally {
      setPendingId(null);
    }
  }

  if (managers.length === 0) {
    return <p>אין בקשות שינוי סוג תחרויות ממתינות כרגע.</p>;
  }

  return (
    <div className={styles.wrap}>
      {actionError && <p className={styles.actionError}>{actionError}</p>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>שם הסטודיו/הלהקה</th>
            <th>טלפון</th>
            <th>סוג נוכחי</th>
            <th>סוג מבוקש</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {managers.map((m) => (
            <tr key={m.id}>
              <td>{m.studioName}</td>
              <td dir="ltr">{m.phone}</td>
              <td>{m.preferredCompetitionType ?? "חילוני"}</td>
              <td>{m.pendingPreferredCompetitionType}</td>
              <td className={styles.actions}>
                <button
                  type="button"
                  className={styles.approve}
                  disabled={pendingId === m.id}
                  onClick={() => handleDecision(m.id, true)}
                >
                  אישור
                </button>
                <button
                  type="button"
                  className={styles.reject}
                  disabled={pendingId === m.id}
                  onClick={() => handleDecision(m.id, false)}
                >
                  דחייה
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
