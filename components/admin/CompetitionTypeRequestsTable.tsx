import { useState } from "react";
import { StudioManager } from "@/types/studioManager";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { resolveCompetitionTypeRequest } from "@/lib/queries/studioManagers";
import styles from "./PendingApprovalsTable.module.css";

// Managers can't change preferred_competition_type themselves anymore (see
// supabase/schema.sql) — requests land here instead, since religious
// competitions have different pricing/rules and Dani wants that switch
// reviewed rather than self-served.
export default function CompetitionTypeRequestsTable({ initialManagers }: { initialManagers: StudioManager[] }) {
  const [managers, setManagers] = useState(initialManagers);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDecision(id: string, approve: boolean) {
    setPendingId(id);
    try {
      await resolveCompetitionTypeRequest(supabaseBrowserClient, id, approve);
      setManagers((current) => current.filter((m) => m.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  if (managers.length === 0) {
    return <p>אין בקשות שינוי סוג תחרויות ממתינות כרגע.</p>;
  }

  return (
    <div className={styles.wrap}>
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
              <td>{m.preferredCompetitionType ?? "רגיל"}</td>
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
