import Image from "next/image";
import styles from "./Hero.module.css";

// Simple 4-point sparkle shape, reused at different sizes/positions/delays.
function Sparkle({ className, delay }: { className: string; delay: string }) {
  return (
    <svg
      className={`${styles.sparkle} ${className}`}
      style={{ animationDelay: delay }}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0c.6 5.5 1 9 2.5 10.5S19.5 12 24 12c-5.5.6-9 1-10.5 2.5S12 19.5 12 24c-.6-5.5-1-9-2.5-10.5S0 12.5 0 12c5.5-.6 9-1 10.5-2.5S12 4.5 12 0z" />
    </svg>
  );
}

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
        <h1 className="en" lang="en">
          <span className={styles.wordmarkWrap}>
            <Image
              src="/images/fly-wordmark.png"
              alt="FLY"
              width={904}
              height={708}
              className={styles.wordmark}
              priority
            />
            <Sparkle className={styles.sparkleA} delay="0s" />
            <Sparkle className={styles.sparkleB} delay="0.8s" />
            <Sparkle className={styles.sparkleC} delay="1.6s" />
            <Sparkle className={styles.sparkleF} delay="2.1s" />
            <Sparkle className={styles.sparkleG} delay="0.5s" />
          </span>
          <br />
          PRODUCTIONS
        </h1>
        <span className={styles.taglineWrap}>
          <p>
            בשביל לעוף לא תמיד צריך כנפיים
            <br />
            לפעמים צריך רק לרקוד
          </p>
          <Sparkle className={styles.sparkleD} delay="0.4s" />
          <Sparkle className={styles.sparkleE} delay="1.2s" />
          <Sparkle className={styles.sparkleH} delay="2s" />
        </span>
      </div>
    </section>
  );
}
