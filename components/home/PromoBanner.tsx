import Image from "next/image";
import styles from "./PromoBanner.module.css";

export default function PromoBanner() {
  return (
    <a  className={styles.promo}>
      <Image
        src="/images/ads.jpg"
        alt="כל מה שאתם צריכים לפרודקשן - צילום, סטילס, תאורה ובמה"
        width={1672}
        height={450}
      />
    </a>
  );
}
