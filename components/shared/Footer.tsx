import Image from "next/image";
import styles from "./Footer.module.css";

// TODO: swap the letter/glyph placeholders below for real icons once
// you add a package like react-icons (`npm install react-icons`),
// e.g. import { FaFacebook } from "react-icons/fa";
const SOCIALS = [
  { label: "Facebook", glyph: "f" },
  { label: "Instagram", glyph: "◎" },
  { label: "Spotify", glyph: "♫" },
  { label: "YouTube", glyph: "▶" },
  { label: "WhatsApp", glyph: "☎" },
  { label: "TikTok", glyph: "♪" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.contact}>
        <div className={styles.label}>ליצירת קשר</div>
        <div className={styles.phone}>052-471-8088</div>
      </div>

      <div className={styles.logo}>
        <Image src="/images/fly-logo.png" alt="FLY Production" width={113} height={46} />
      </div>

      <div className={styles.follow}>
        <div className={styles.label}>בשביל להישאר מעודכנים תעקבו!</div>
        <div className={styles.socialIcons}>
          {SOCIALS.map((s) => (
            <a key={s.label} href="#" aria-label={s.label}>
              {s.glyph}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
