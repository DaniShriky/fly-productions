import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { competitions } from "@/data/competitions";
import { REGISTRATION_URL } from "@/data/registration";
import { getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import styles from "./Nav.module.css";

export default function Nav() {
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
      <Link href="/" className={styles.logoWrap}>
        {/* width/height are just next/image's required layout hint — actual
            display size comes from .logoWrap img's height:40/width:auto in
            the CSS module, which scales to the file's real aspect ratio. */}
        <Image src="/images/fly-logo.png" alt="FLY Production" width={200} height={145} />
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

      <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ""}`}>
        <a
          href={REGISTRATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaPill}
          onClick={() => setMobileOpen(false)}
        >
          הרשמה לתחרויות
        </a>

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
                  <span className={styles.sub}>
                    <span dir="ltr" lang="en">{getCompetitionDateLabel(c.date)}</span> · {c.location}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
