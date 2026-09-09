import { FormEvent, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import styles from "./OtpEmailForm.module.css";

type Props = {
  mode: "register" | "login";
  onVerified: (userId: string, email: string) => void | Promise<void>;
};

// Shared two-step "email -> code" UI for both /register and /login. Register
// mode creates a brand-new auth user if the email doesn't exist yet; login
// mode never does (a nonexistent email should point people at /register
// instead of silently creating an account).
export default function OtpEmailForm({ mode, onVerified }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === "register" },
    });

    setLoading(false);

    if (error) {
      setError(
        mode === "login"
          ? "לא הצלחנו לשלוח קוד. ודאי שנרשמת קודם, או נסי להירשם."
          : "לא הצלחנו לשלוח קוד. נסי שוב בעוד רגע."
      );
      return;
    }

    setStep("code");
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabaseBrowserClient.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);

    if (error || !data.user) {
      setError("הקוד שגוי או פג תוקף. נסי שוב.");
      return;
    }

    await onVerified(data.user.id, email);
  }

  if (step === "email") {
    return (
      <form className={styles.form} onSubmit={handleSendCode}>
        <label className={styles.field}>
          <span>אימייל</span>
          <input
            type="email"
            dir="ltr"
            className="en"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "שולחת..." : "שליחת קוד"}
        </button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleVerifyCode}>
      <p className={styles.hint}>
        שלחנו קוד בן 6 ספרות ל־<span dir="ltr">{email}</span>
      </p>
      <label className={styles.field}>
        <span>קוד</span>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          className="en"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "מאמתת..." : "אישור"}
      </button>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
      >
        שינוי כתובת אימייל
      </button>
    </form>
  );
}
