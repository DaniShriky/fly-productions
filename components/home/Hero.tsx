import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* TODO: replace with a real photo. Easiest approach: set this as a
          CSS background-image in Hero.module.css (.image { background-image:
          url('/images/hero.jpg'); background-size: cover; }) rather than
          next/image, since it's a full-bleed decorative background. */}
      <div className={styles.image} />
      <div className={styles.fade} />
      <div className={styles.content}>
        <h1 className="en">
          <Image
            src="/images/fly-wordmark.png"
            alt="FLY"
            width={904}
            height={708}
            className={styles.wordmark}
            priority
          />
          <br />
          PRODUCTIONS
        </h1>
        <p>
          אנחנו מתמחים בהפקות אירועים מדהימים כבר 20 שנה, אנו גאים להמשיך לארגן
          ולהפיק עבורכם את התחרויות, הפסטיבלים והכנסים הכי טובים תוך שמירה על
          ערכי אמינות, מקצועיות ויחס אישי.
        </p>
      </div>
    </section>
  );
}
