import styles from "./VideoSection.module.css";

export default function VideoSection() {
  return (
    <section style={{ paddingTop: 10 }}>
      <div className={styles.videoSection}>
        {/* TODO: replace with a real <video> element or an embedded player
            once there's a real highlight reel. */}
        <h2 className="en">FLY PROD</h2>
        <div className={styles.playBtn}>▶</div>
      </div>
    </section>
  );
}
