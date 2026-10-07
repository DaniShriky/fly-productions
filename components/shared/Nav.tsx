import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Competition } from "@/types/competition";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import { getOwnStudioManager, getProfilePhotoUrl } from "@/lib/queries/studioManagers";
import { getOwnAdmin } from "@/lib/queries/admins";
import { PROFILE_UPDATED_EVENT, ProfileUpdateDetail } from "@/lib/profileUpdateEvent";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { InvoiceIcon } from "@/components/dashboard/icons";
import styles from "./Nav.module.css";

function UserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// One letter from each of the first two words in the studio name (e.g. "FLY
// Dance Studio" -> "FD") — same convention as ProfileCard's avatar badge.
function initialsOf(studioName: string): string {
  const words = studioName.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Nav({ competitions }: { competitions: Competition[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studioName, setStudioName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Reacts to login/logout immediately, including right after /login's
  // router.push (a soft navigation — Nav doesn't remount, so this needs a
  // live subscription rather than a one-off check on mount).
  useEffect(() => {
    async function syncSession(session: { user: { id: string } } | null) {
      setIsLoggedIn(!!session);
      if (!session) {
        setIsAdmin(false);
        setStudioName(null);
        setPhotoUrl(null);
        return;
      }
      // Same "Self admin check" RLS policy already used by /login's
      // destination logic (see lib/resolveLoginDestination.ts) — determines
      // which profile-menu link to show below (per Dani, 2026-10-05: an
      // admin account should see "ניהול האתר" instead of "הרשמה לתחרויות",
      // which doesn't apply to her) and which profile this account's own
      // name/photo come from.
      const admin = await getOwnAdmin(supabaseBrowserClient, session.user.id).catch(() => null);
      setIsAdmin(!!admin);

      if (admin) {
        setStudioName(admin.name ?? null);
        setPhotoUrl(admin.profileImagePath ? getProfilePhotoUrl(supabaseBrowserClient, admin.profileImagePath) : null);
        return;
      }

      // Best-effort — a manager whose row hasn't landed yet simply falls
      // back to a generic avatar/label instead of a name.
      const manager = await getOwnStudioManager(supabaseBrowserClient, session.user.id).catch(() => null);
      setStudioName(manager?.studioName ?? null);
      setPhotoUrl(manager?.profileImagePath ? getProfilePhotoUrl(supabaseBrowserClient, manager.profileImagePath) : null);
    }

    supabaseBrowserClient.auth.getSession().then(({ data: { session } }) => syncSession(session));
    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => syncSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // ProfileEditForm (on /profile) lives in a separate component tree with no
  // shared state — this catches its saves so the name/photo shown here
  // update immediately, without waiting for a full page reload/navigation.
  useEffect(() => {
    function handleProfileUpdated(e: Event) {
      const detail = (e as CustomEvent<ProfileUpdateDetail>).detail;
      if (detail.studioName !== undefined) setStudioName(detail.studioName);
      if (detail.profileImageUrl !== undefined) setPhotoUrl(detail.profileImageUrl);
    }
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, []);

  async function handleSignOut() {
    await supabaseBrowserClient.auth.signOut();
    setMobileOpen(false);
    setProfileOpen(false);
    router.push("/");
  }

  // Close the dropdowns when clicking anywhere outside them.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Close the mobile menu whenever the viewport widens past the breakpoint.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 700) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logoWrap}>
        {/* width/height are just next/image's required layout hint — actual
            display size comes from .logoWrap img's height:40/width:auto in
            the CSS module, which scales to the file's real aspect ratio. */}
        <Image src="/images/fly-logo.png" alt="FLY Production" width={200} height={145} />
      </Link>

      <div className={styles.navRight}>
        <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ""}`}>
          {isLoggedIn ? (
            <div ref={profileRef} className={`${styles.profileDropdown} ${profileOpen ? styles.open : ""}`}>
              <button
                type="button"
                className={styles.profileTrigger}
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen((o) => !o);
                }}
              >
                <span className={styles.profileAvatar}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- manager-uploaded Supabase Storage URL, not a static site asset
                    <img src={photoUrl} alt="" className={styles.profileAvatarPhoto} />
                  ) : studioName ? (
                    initialsOf(studioName)
                  ) : (
                    <UserIcon />
                  )}
                </span>
                <span className={styles.profileName}>{studioName ?? "החשבון שלי"}</span>
                <span className={styles.chev}>▾</span>
              </button>
              <div className={styles.dropdownMenu}>
                <Link
                  href="/profile"
                  className={styles.menuItem}
                  onClick={() => {
                    setProfileOpen(false);
                    setMobileOpen(false);
                  }}
                >
                  <UserIcon size={16} />
                  הפרטים שלי
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className={styles.menuItem}
                    onClick={() => {
                      setProfileOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <DashboardIcon />
                    ניהול האתר
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className={styles.menuItem}
                      onClick={() => {
                        setProfileOpen(false);
                        setMobileOpen(false);
                      }}
                    >
                      <DashboardIcon />
                      הרשמה לתחרויות
                    </Link>
                    <Link
                      href="/dashboard/history"
                      className={styles.menuItem}
                      onClick={() => {
                        setProfileOpen(false);
                        setMobileOpen(false);
                      }}
                    >
                      <InvoiceIcon size={16} />
                      היסטוריית הזמנות
                    </Link>
                  </>
                )}
                <div className={styles.menuDivider} />
                <button type="button" className={styles.menuItem} onClick={handleSignOut}>
                  <SignOutIcon />
                  יציאה
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className={styles.loginLink} onClick={() => setMobileOpen(false)}>
              <UserIcon />
              התחברות
            </Link>
          )}

          <div ref={dropdownRef} className={`${styles.dropdown} ${open ? styles.open : ""}`}>
            <button
              className={styles.dropdownTrigger}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
            >
              תחרויות <span className={styles.chev}>▾</span>
            </button>
            <div className={styles.dropdownMenu}>
              {competitions.map((c) => (
                <Link
                  key={c.slug}
                  href={`/competitions/${c.slug}`}
                  className={styles.menuItem}
                  onClick={() => {
                    setOpen(false);
                    setMobileOpen(false);
                  }}
                >
                  <span className={styles.menuItemLogo}>
                    {c.logo && <Image src={c.logo} alt="" width={60} height={50} />}
                  </span>
                  <span className={styles.menuItemText}>
                    <span className="en" lang="en">{c.name}</span>
                    <span className={styles.sub} dir="ltr" lang="en">{getCompetitionDateLabel(c.date)}</span>
                    <span className={styles.sub}>{c.location}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Link href="/dashboard" className={styles.ctaPill} onClick={() => setMobileOpen(false)}>
          הרשמה לתחרויות
        </Link>

        <button
          className={styles.menuButton}
          aria-label={mobileOpen ? "סגירת תפריט" : "פתיחת תפריט"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
