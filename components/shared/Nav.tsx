import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import { REGISTRATION_URL } from "@/data/registration";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import styles from "./Nav.module.css";

export default function Nav({ competitions }: { competitions: Competition[] }) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
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
      {/* Plain <a>, not next/link — see the matching comment on the
          competition links below in the dropdown for why. */}
      <a href="/" className={styles.logoWrap}>
        {/* width/height are just next/image's required layout hint — actual
            display size comes from .logoWrap img's height:40/width:auto in
            the CSS module, which scales to the file's real aspect ratio. */}
        <Image src="/images/fly-logo.png" alt="FLY Production" width={200} height={145} />
      </a>

      <div className={styles.navRight}>
        <a
          href={REGISTRATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaPill}
          onClick={() => setMobileOpen(false)}
        >
          הרשמה לתחרויות
        </a>

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

        <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ""}`}>
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
              {/* Plain <a>, not next/link: navigating home <-> a competition
                  page repeatedly via client-side routing could trigger a
                  WebKit crash on iOS Safari ("a problem repeatedly
                  occurred") after a few round-trips — a refresh on the
                  exact same URL always recovered instantly, which pointed
                  at the client-side transition itself rather than the page
                  or server. A real full navigation sidesteps it entirely,
                  at the cost of losing the instant client-side transition
                  for this specific hop. */}
              {competitions.map((c) => (
                <a
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
                    <span className={styles.sub}>
                      <span dir="ltr" lang="en">{getCompetitionDateLabel(c.date)}</span> · {c.location}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
