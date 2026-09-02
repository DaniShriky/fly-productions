import Image from "next/image";
import { WHATSAPP_URL } from "@/lib/contact";
import styles from "./PromoBanner.module.css";

export default function PromoBanner() {
  return (
    <a
      className={styles.promo}
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="כל מה שאתם צריכים לפרודקשן - צילום, סטילס, תאורה ובמה - צרו קשר בוואטסאפ"
    >
      <Image
        src="/images/ads.jpg"
        alt="כל מה שאתם צריכים לפרודקשן - צילום, סטילס, תאורה ובמה"
        width={1672}
        height={450}
        className={styles.desktop}
      />

      <Image
        src="/images/ads-phone.jpg"
        alt="כל מה שאתם צריכים לפרודקשן - צילום, סטילס, תאורה ובמה"
        width={768}
        height={900}
        className={styles.mobile}
      />
    </a>
  );
}