import styles from "./PromoBanner.module.css";

const SERVICES = ["צילום מקצועי", "הפקת במה", "תאורה וסאונד", "סטילס אירוע"];

export default function PromoBanner() {
  return (
    <div className={styles.promo}>
      <h3>כל מה שאתם צריכים לפרודקשן</h3>
      <p>צילום, סטילס, תאורה ובמה - הכל תחת קורת גג אחת</p>
      <div className={styles.grid}>
        {SERVICES.map((s) => (
          <div key={s} className={styles.item}>
            <span className={styles.dot} />
            {s}
          </div>
        ))}
      </div>
      <a href="tel:0524718088" className={styles.btn}>052-471-8088</a>
    </div>
  );
}
