import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import styles from "./CompetitionHero.module.css";

export default function CompetitionHero({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  const query = encodeURIComponent(competition.location);
  const wazeUrl = `https://waze.com/ul?q=${query}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  const [routeOpen, setRouteOpen] = useState(false);
  const routeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (routeRef.current && !routeRef.current.contains(e.target as Node)) {
        setRouteOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.bg}>
        <Image
          src={competition.image}
          alt={competition.name}
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
      <div className={styles.fade} />
      <div className={styles.content}>
        <div className={styles.badge}>{competition.name}</div>
        <h1>
          <span className="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h1>
        <div className={styles.metaDate} dir="ltr">{competition.date}</div>
        <div className={styles.metaLoc}>{competition.location}</div>

        <div ref={routeRef} className={styles.routeWrap}>
          <button
            type="button"
            className={styles.routeBtn}
            onClick={(e) => {
              e.stopPropagation();
              setRouteOpen((o) => !o);
            }}
          >
            <span className={styles.circle}>➤</span>
            <span className={styles.routeLabel}>מסלול</span>
          </button>

          {routeOpen && (
            <div className={styles.routeMenu}>
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
                🚗 Waze
              </a>
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                📍 Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
