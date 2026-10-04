import { useEffect, useState } from "react";
import { StudioManager } from "@/types/studioManager";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { getPendingStudioManagers, updateStudioManagerStatus } from "@/lib/queries/studioManagers";
import styles from "./PendingApprovalsTable.module.css";

export default function PendingApprovalsTable({ initialManagers }: { initialManagers: StudioManager[] }) {
  const [managers, setManagers] = useState(initialManagers);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // A new registration should appear here the moment it's submitted, not
  // only on the next page load — per Dani, 2026-10-03. Refetches on any
  // studio_managers change rather than merging the realtime payload
  // directly, so this stays correct even though the query itself filters
  // to status='pending' (a plain row update wouldn't tell us on its own
  // whether a manager entered or left that set).
  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel("admin-pending-approvals")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_managers" }, () => {
        getPendingStudioManagers(supabaseBrowserClient)
          .then(setManagers)
          .catch((err) => console.error("Live pending-approvals refresh failed:", err));
      })
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, []);

  async function handleDecision(id: string, status: "approved" | "rejected") {
    setPendingId(id);
    try {
      await updateStudioManagerStatus(supabaseBrowserClient, id, status);
      setManagers((current) => current.filter((m) => m.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  if (managers.length === 0) {
    return <p>אין בקשות ממתינות כרגע.</p>;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>שם הסטודיו/הלהקה</th>
            <th>טלפון</th>
            <th>אימייל</th>
            <th>מאיפה שמעה</th>
            <th>סוג תחרויות</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {managers.map((m) => (
            <tr key={m.id}>
              <td>{m.studioName}</td>
              <td dir="ltr">{m.phone}</td>
              <td dir="ltr">{m.email}</td>
              <td>{m.referralSource ?? "—"}</td>
              <td>{m.preferredCompetitionType ?? "—"}</td>
              <td className={styles.actions}>
                <button
                  type="button"
                  className={styles.approve}
                  disabled={pendingId === m.id}
                  onClick={() => handleDecision(m.id, "approved")}
                >
                  אישור
                </button>
                <button
                  type="button"
                  className={styles.reject}
                  disabled={pendingId === m.id}
                  onClick={() => handleDecision(m.id, "rejected")}
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
