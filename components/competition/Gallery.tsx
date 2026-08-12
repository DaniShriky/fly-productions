import { Competition } from "@/types/competition";
import styles from "./Gallery.module.css";

export default function Gallery({ competition }: { competition: Competition }) {
  return (
    <section>
      <div className={styles.head}>
        <h2 className="en">GALLERY</h2>
      </div>
      <div className={styles.grid}>
        {competition.galleryGradients.map((g, i) => (
          // TODO: replace each with next/image once real photos exist
          <div key={i} className={styles.item} style={{ background: g }} />
        ))}
      </div>
      <div className={styles.credit}>צילום: Fly Productions</div>
    </section>
  );
}
