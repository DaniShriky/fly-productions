import { FormEvent, useEffect, useState } from "react";
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
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // Nothing previously stopped repeated fast clicks on "שליחת קוד מחדש" —
  // past a few, Supabase just starts throttling and the error shown
  // ("לא הצלחנו לשלוח קוד חדש") doesn't explain why. A plain 30s client-side
  // cooldown after any send (the first one included) avoids hitting that
  // wall in normal use.
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Fades the "קוד חדש נשלח" confirmation on its own rather than leaving it
  // sitting there indefinitely, or relying on the next form action to clear it.
  useEffect(() => {
    if (!resent) return;
    const id = setTimeout(() => setResent(false), 5000);
    return () => clearTimeout(id);
  }, [resent]);

  useEffect(() => {
    if (!resendAvailableAt) return;
    function tick() {
      const left = Math.max(0, Math.ceil(((resendAvailableAt ?? 0) - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) setResendAvailableAt(null);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendAvailableAt]);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Register mode only — catches an already-registered email before
    // sending a code and walking her through the whole verification flow,
    // instead of only after (register.tsx's insert-time 23505 check is still
    // there as a fallback, for the rare race where two tabs register the
    // same email at once). email_is_registered is a security-definer RPC
    // that returns only a boolean, safe to call before she has a session.
    if (mode === "register") {
      const { data: alreadyRegistered } = await supabaseBrowserClient.rpc("email_is_registered", {
        check_email: email,
      });
      if (alreadyRegistered) {
        setLoading(false);
        setError("כבר נרשמתם בעבר עם אימייל זה - אפשר להתחבר דרך ‘כניסת מנהלים’ בתפריט.");
        return;
      }
    }

    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === "register" },
    });

    setLoading(false);

    if (error) {
      setError(
        mode === "login"
          ? "לא הצלחנו לשלוח קוד. ודאו שנרשמתם קודם, או נסו להירשם."
          : "לא הצלחנו לשלוח קוד. נסו שוב בעוד רגע."
      );
      return;
    }

    setStep("code");
    setResendAvailableAt(Date.now() + 30000);
  }

  // Not a different code path from the initial send — signInWithOtp just
  // sends another code to the same email. Previously the only way to get a
  // fresh code was "שינוי כתובת אימייל", which also wiped the entered code
  // and (misleadingly) read as if you were meant to type a different email.
  async function handleResend() {
    setResending(true);
    setError(null);
    setResent(false);

    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === "register" },
    });

    setResending(false);

    if (error) {
      setError("לא הצלחנו לשלוח קוד חדש. נסו שוב בעוד רגע.");
      return;
    }
    setResent(true);
    setResendAvailableAt(Date.now() + 30000);
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
      setError("הקוד שגוי או פג תוקף. נסו שוב.");
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
          {loading ? "שולחים..." : "שליחת קוד"}
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
      <div className={styles.secondaryRow}>
        <button type="button" className={styles.secondary} onClick={handleResend} disabled={resending || cooldownLeft > 0}>
          {resending ? "שולחים..." : cooldownLeft > 0 ? `שליחה חוזרת בעוד ${cooldownLeft} שניות` : "שליחת קוד מחדש"}
        </button>
        {resent && <span className={styles.resentNote}>✓ קוד חדש נשלח</span>}
      </div>
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
