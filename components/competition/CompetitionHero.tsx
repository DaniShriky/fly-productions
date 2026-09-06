import { useEffect, useRef, useState, CSSProperties } from "react";
import Image from "next/image";
import { Competition } from "@/types/competition";
import { splitReligiousSuffix } from "@/lib/splitReligiousSuffix";
import { getCompetitionDays, getCompetitionDateLabel } from "@/lib/getCompetitionDays";
import { getGoogleCalendarUrl, getIcsDataUrl } from "@/lib/calendarLinks";
import styles from "./CompetitionHero.module.css";

export default function CompetitionHero({ competition }: { competition: Competition }) {
  const { main, suffix } = competition.isReligious
    ? splitReligiousSuffix(competition.name)
    : { main: competition.name, suffix: null };

  const query = encodeURIComponent(competition.location);
  const wazeUrl = `https://waze.com/ul?q=${query}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const googleCalendarUrl = getGoogleCalendarUrl(competition);
  const icsDataUrl = getIcsDataUrl(competition);

  const [routeOpen, setRouteOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const routeRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (routeRef.current && !routeRef.current.contains(e.target as Node)) {
        setRouteOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <section className={styles.hero}>
      <div
        className={`${styles.imageBox} ${competition.heroImagePosition ? styles.imageBoxCustomPos : ""}`}
        style={competition.heroImagePosition ? ({ "--hero-img-pos": competition.heroImagePosition } as CSSProperties) : undefined}
      >
        <Image
          src={competition.image}
          alt={competition.name}
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <div className={styles.imageFade} />
      </div>
      <div className={styles.content}>
        <div className={styles.fade} />
        {competition.logo ? (
          <div className={styles.badgeImage}>
            <Image src={competition.logo} alt={competition.name} fill style={{ objectFit: "contain" }} />
          </div>
        ) : (
          <div className={styles.badge}>{competition.name}</div>
        )}
        <h1>
          <span className="en" lang="en">{main}</span>
          {suffix && <span className={styles.religiousSuffix}> {suffix}</span>}
        </h1>
        <div className={styles.metaDate} dir="ltr" lang="en">{getCompetitionDateLabel(competition.date)}</div>
        <div className={styles.metaDay}>{getCompetitionDays(competition.date)}</div>
        <div className={styles.metaLoc}>{competition.location}</div>

        <div className={styles.actionsRow}>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
                    <rect x="3" y="11" width="18" height="6" rx="2" />
                    <circle cx="7.5" cy="17" r="1.5" />
                    <circle cx="16.5" cy="17" r="1.5" />
                  </svg>
                  <span>Waze</span>
                </a>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Google Maps</span>
                </a>
              </div>
            )}
          </div>

          {googleCalendarUrl && icsDataUrl && (
            <div ref={calendarRef} className={styles.routeWrap}>
              <button
                type="button"
                className={styles.routeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setCalendarOpen((o) => !o);
                }}
              >
                <span className={styles.circle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18" />
                    <path d="M8 3v4" />
                    <path d="M16 3v4" />
                  </svg>
                </span>
                <span className={styles.routeLabel}>הוספה ליומן</span>
              </button>

              {calendarOpen && (
                <div className={styles.routeMenu}>
                  <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="3" />
                      <path d="M3 10h18" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                    <span>Google Calendar</span>
                  </a>
                  {/* No `download` attribute — on iOS Safari that forces a
                      save to the Files app instead of opening the native
                      "Add Event" prompt. Plain navigation to the data: URL
                      lets each platform hand it to its own calendar app
                      (Apple Calendar, Samsung/Google Calendar, Outlook…). */}
                  <a href={icsDataUrl} target="_blank" rel="noopener noreferrer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="3" />
                      <path d="M3 10h18" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                      <path d="M12 13v6" />
                      <path d="M9 16h6" />
                    </svg>
                    <span>Apple Calendar</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
