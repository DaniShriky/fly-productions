import { testimonials } from "@/data/testimonials";
import { useAutoScroll } from "@/lib/useAutoScroll";
import styles from "./Testimonials.module.css";

const REPEAT = 3;

export default function Testimonials() {
  const scrollRef = useAutoScroll<HTMLDivElement>(35, REPEAT);
  const trackItems = Array.from({ length: REPEAT }, () => testimonials).flat();

  return (
    <section>
      <div className={styles.head}>
        <h2 className="en">WHAT OUR CLIENTS ARE SAYING</h2>
      </div>
      <div className={styles.wrapper}>
        <div ref={scrollRef} className={styles.viewport}>
          <div className={styles.track}>
            {trackItems.map((t, i) => (
              <div key={`${t.id}-${i}`} className={styles.card}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.quote}>{t.quote}</p>
                <div className={styles.who}>
                  {t.studioName}
                  <br />
                  {t.city}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.fadeRight} />
      </div>
    </section>
  );
}
