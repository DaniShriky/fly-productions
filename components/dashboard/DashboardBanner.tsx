import Image from "next/image";
import styles from "./DashboardBanner.module.css";

// Same desktop/mobile-image-swap pattern as components/home/PromoBanner.tsx —
// a designed graphic with its own baked-in text, not a text-over-image hero
// like CompetitionHero (which composes dynamic per-competition data instead).
export default function DashboardBanner() {
  return (
    <div className={styles.banner}>
      <Image
        src="/images/dashboard-banner.jpg"
        alt="FLY Festivals 2027 — הפקות אירועים מדהימים"
        width={5000}
        height={625}
        priority
        className={styles.desktop}
      />

      <Image
        src="/images/dashboard-banner-mobile.jpg"
        alt="FLY Festivals 2027 — הפקות אירועים מדהימים"
        width={1600}
        height={400}
        priority
        className={styles.mobile}
      />
    </div>
  );
}
