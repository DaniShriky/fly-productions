import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import { getAllCompetitions } from "@/lib/queries/competitions";
import styles from "./terms.module.css";

export default function Refunds({ competitions }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>מדיניות ביטולים והחזרים | FLY Productions</title>
      </Head>

      <Nav competitions={competitions} />

      <main className={styles.wrap}>
        <h1>מדיניות ביטולים והחזרים</h1>

        <p>
          המדיניות שלהלן חלה על דמי ההשתתפות בתחרויות המופקות על ידי FLY Productions. המועדים המדויקים נקבעים
          בנפרד לכל תחרות ביחס לתאריך האירוע שלה, ומפורטים בעת ההרשמה ובחומרי התחרות.
        </p>

        <h2>מדרגות הביטול</h2>
        <ul>
          <li>
            <strong>ביטול עד כחודשיים לפני מועד האירוע</strong> - החזר כספי מלא של דמי ההשתתפות.
          </li>
          <li>
            <strong>ביטול בחלון הזמן שלאחר מכן (כעשרה ימים נוספים)</strong> - החזר של 50% מדמי ההשתתפות.
          </li>
          <li>
            <strong>ביטול לאחר מכן ועד למועד האירוע</strong> - לא יינתן החזר כספי.
          </li>
        </ul>

        <h2>הזמנות צילום (וידאו/סטילס)</h2>
        <p>
          הזמנת שירותי צילום היא הזמנה נפרדת מדמי ההשתתפות, ויש לבצעה ולשלם עבורה עד למועד שנקבע מראש (בדרך כלל
          כעשרה ימים לפני האירוע). ביטול הזמנת צילום כפוף לאותה מדיניות מדרגות כמפורט לעיל, ביחס למועד ביצוע
          ההזמנה.
        </p>

        <h2>כיצד מבצעים ביטול</h2>
        <p>
          בקשת ביטול יש להגיש בפנייה ישירה למשרד - בטלפון או בוואטסאפ - ולא רק באמצעות הפסקת תשלום או אי-הגעה
          לאירוע. מועד קבלת הפנייה בפועל הוא הקובע לעניין מדרגת ההחזר.
        </p>
        <div className={styles.contact}>
          <p>
            טלפון / וואטסאפ: <a href="tel:+972524718088">052-471-8088</a>
          </p>
        </div>

        <h2>מקרים חריגים</h2>
        <p>
          החברה רשאית, לפי שיקול דעתה ובמקרים חריגים, לאשר סטייה ממדיניות זו (למשל עקב נסיבות רפואיות מתועדות).
          אישור כאמור יינתן בכתב מראש ואינו ניתן להסקה מהתנהגות בעבר.
        </p>

        <h2>עדכון אחרון</h2>
        <p className={styles.updated}>מדיניות זו עודכנה לאחרונה בתאריך 02.10.2026.</p>
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const competitions = await getAllCompetitions();
  return { props: { competitions } };
};
