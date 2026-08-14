import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.imageBox}>
        <Image
          src="/images/hero-cropped.jpg"
          alt="רקדניות על הבמה בהפקת FLY"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className={styles.imageFade} />
      </div>
      <div className={styles.content}>
        <div className={styles.fade} />
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
