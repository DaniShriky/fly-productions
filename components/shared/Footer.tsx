import Image from "next/image";
import { FaFacebookF, FaInstagram, FaSpotify, FaYoutube, FaWhatsapp, FaTiktok } from "react-icons/fa";
import styles from "./Footer.module.css";

const PHONE = "052-471-8088";
// wa.me needs the number in international format with no leading 0.
const WHATSAPP_URL = `https://wa.me/972${PHONE.replace(/\D/g, "").replace(/^0/, "")}`;

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
      <div className={styles.contact}>
        <div className={styles.label}>ליצירת קשר</div>
        <div className={styles.phone}>{PHONE}</div>
      </div>

      <div className={styles.logo}>
        <Image src="/images/fly-logo.png" alt="FLY Production" width={113} height={46} />
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
    </footer>
  );
}
