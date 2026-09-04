import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaSpotify, FaYoutube, FaWhatsapp, FaTiktok } from "react-icons/fa";
import { PHONE, PHONE_TEL_URL, WHATSAPP_URL } from "@/lib/contact";
import styles from "./Footer.module.css";

const SOCIALS = [
  { label: "Facebook", Icon: FaFacebookF, href: "https://www.facebook.com/andreyybaryshnikov" },
  { label: "Instagram", Icon: FaInstagram, href: "https://www.instagram.com/fly_hafakot" },
  { label: "Spotify", Icon: FaSpotify, href: "https://open.spotify.com/show/08Ffj6opLWCrCgVYQV003k" },
  { label: "YouTube", Icon: FaYoutube, href: "https://www.youtube.com/@fly_hafakot" },
  { label: "WhatsApp", Icon: FaWhatsapp, href: WHATSAPP_URL },
  { label: "TikTok", Icon: FaTiktok, href: "https://www.tiktok.com/@fly_hafakot" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.main}>
        <div className={styles.contact}>
          <div className={styles.label}>ליצירת קשר</div>
          <a className={styles.phone} href={PHONE_TEL_URL}>
            {PHONE}
          </a>
        </div>

        <div className={styles.logo}>
          {/* Logo's native resolution is ~1487:1306 — width/height kept in
              that ratio so next/image doesn't stretch it into the old
              wordmark logo's wider 113:46 box. */}
          <Image src="/images/fly-logo.png" alt="FLY Production" width={52} height={46} />
        </div>

        <div className={styles.follow}>
          <div className={styles.label}>בשביל להישאר מעודכנים תעקבו!</div>
          <div className={styles.socialIcons}>
            {SOCIALS.map(({ label, Icon, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.legal}>
        <Link href="/accessibility">הצהרת נגישות</Link>
      </div>
    </footer>
  );
}
