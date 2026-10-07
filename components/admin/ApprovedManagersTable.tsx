import { useEffect, useState } from "react";
import { StudioManager } from "@/types/studioManager";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getApprovedStudioManagers, deleteStudioManager } from "@/lib/queries/studioManagers";
import { errorDetail } from "@/lib/errorDetail";
import styles from "./PendingApprovalsTable.module.css";

// Every studio manager Dani has already approved — per her request
// (2026-10-07), the admin dashboard needs a way to see who's registered
// and, if needed, remove one (duplicate or mistaken signup, etc.).
export default function ApprovedManagersTable({ initialManagers }: { initialManagers: StudioManager[] }) {
  const [managers, setManagers] = useState(initialManagers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Same refetch-on-any-change approach as PendingApprovalsTable/
  // CompetitionTypeRequestsTable — a manager newly approved or removed
  // elsewhere should show up (or disappear) here live.
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel("admin-approved-managers")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_managers" }, () => {
        getApprovedStudioManagers(supabaseBrowserClient)
          .then(setManagers)
          .catch((err) => console.error("Live approved-managers refresh failed:", err));
      })
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  async function handleDelete(m: StudioManager) {
    if (!confirm(`להסיר את "${m.studioName}" מהמערכת? הפעולה לא הפיכה.`)) return;

    setPendingId(m.id);
    setActionError(null);
    try {
      await deleteStudioManager(supabaseBrowserClient, m.id);
      setManagers((current) => current.filter((x) => x.id !== m.id));
    } catch (err) {
      console.error("Studio manager deletion failed:", err);
      const detail = errorDetail(err);
      // Postgres foreign-key violation (code 23503) — she still has
      // dances/registrations on file. See the Round 15 comment in
      // supabase/schema.sql for why this isn't just cascaded away.
      setActionError(
        detail?.toLowerCase().includes("foreign key")
          ? `לא ניתן להסיר את "${m.studioName}" - יש לה/לו ריקודים או הרשמות רשומים במערכת.`
          : `ההסרה נכשלה - נסו שוב.${detail ? ` (${detail})` : ""}`
      );
    } finally {
      setPendingId(null);
    }
  }

  if (managers.length === 0) {
    return <p>אין עדיין מנהלי סטודיו רשומים.</p>;
  }

  return (
    <div className={styles.wrap}>
      {actionError && <p className={styles.actionError}>{actionError}</p>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>שם הסטודיו/הלהקה</th>
            <th>מנהל/ת</th>
            <th>טלפון</th>
            <th>אימייל</th>
            <th>יישוב</th>
            <th>סוג תחרויות</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {managers.map((m) => (
            <tr key={m.id}>
              <td>{m.studioName}</td>
              <td>{m.managerName ?? "—"}</td>
              <td dir="ltr">{m.phone}</td>
              <td dir="ltr">{m.email}</td>
              <td>{m.city ?? "—"}</td>
              <td>{m.preferredCompetitionType ?? "חילוני"}</td>
              <td className={styles.actions}>
                <button
                  type="button"
                  className={styles.reject}
                  disabled={pendingId === m.id}
                  onClick={() => handleDelete(m)}
                >
                  הסרה
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
