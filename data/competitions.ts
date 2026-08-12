import { Competition } from "@/types/competition";

// TODO: this whole file gets deleted once Supabase is connected.
// getStaticProps in pages/index.tsx and pages/competitions/[slug].tsx
// will fetch these same fields from the `competitions` table instead.

export const competitions: Competition[] = [
  {
    id: "1",
    slug: "art-fantasy-carmiel",
    name: "ART FANTASY",
    date: "1 / 1 / 27",
    location: "היכל התרבות כרמיאל",
    isReligious: false,
    heroGradient: "linear-gradient(165deg,#8a4fc9,#2d3a8f 65%,#1a2a5c)",
    thumbnailGradient: "linear-gradient(165deg,#8a4fc9,#2d3a8f 65%,#1a2a5c)",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">ART FANTASY</span> מבית <span class="hl">FLY הפקות</span> מתקיים מדי שנה בכרמיאל ומביא לצפון הארץ חוויית מחול גדולה ומרגשת.',
      "הפסטיבל מארח להקות, סטודיואים והשתתפויות מכל רחבי הארץ ומכל הגילאים, ומעניק לכל משתתפת הזדמנות להציג במה שמישית ולהתפתחות ברמה הגבוהה ביותר.",
      "במרכז הפסטיבל עומדים אהבה ואיכות אמיתית לעולם המחול, לצד הופעה זוכה להתייחסות מצוות שופטים מוביל ומנוסה, המעניקים חוות דעת מקצועית ומשוב לרקדנים.",
      "הפסטיבל פתוח לכל סוגות המחול ולכל הרמות — מקבוצות שעושות את צעדיהן הראשונות ועד להקות מקצועיות מובילות, כולן מקבלות את הבמה הראויה להן.",
    ],
    galleryGradients: [
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "2",
    slug: "mega-star",
    name: "MEGA STAR",
    date: "7 - 10 / 2 / 27",
    location: "נס ציונה",
    isReligious: false,
    heroGradient: "linear-gradient(165deg,#c23a5a,#7a2050)",
    thumbnailGradient: "linear-gradient(165deg,#c23a5a,#7a2050)",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">MEGA STAR</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "3",
    slug: "mega-star-religious",
    name: "MEGA STAR (מגזר דתי)",
    date: "26 - 27 / 2 / 27",
    location: "תיאטרון הצפון",
    isReligious: true,
    heroGradient: "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    thumbnailGradient: "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">MEGA STAR</span> (מגזר דתי) — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "4",
    slug: "dance-fest",
    name: "DANCE FEST",
    date: "14 / 3 / 27",
    location: "אשדוד",
    isReligious: false,
    heroGradient: "linear-gradient(165deg,#4fae8a,#1a5c4a)",
    thumbnailGradient: "linear-gradient(165deg,#4fae8a,#1a5c4a)",
    descriptionParagraphs: ["TODO: להוסיף תיאור אמיתי."],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
  {
    id: "5",
    slug: "stage-up",
    name: "STAGE UP",
    date: "2 / 4 / 27",
    location: "ראשון לציון",
    isReligious: false,
    heroGradient: "linear-gradient(165deg,#ae8a4f,#5c3a1a)",
    thumbnailGradient: "linear-gradient(165deg,#ae8a4f,#5c3a1a)",
    descriptionParagraphs: ["TODO: להוסיף תיאור אמיתי."],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
  {
    id: "6",
    slug: "grand-finale",
    name: "GRAND FINALE",
    date: "20 / 5 / 27",
    location: "תל אביב",
    isReligious: false,
    heroGradient: "linear-gradient(165deg,#6a4fae,#2a1a5c)",
    thumbnailGradient: "linear-gradient(165deg,#6a4fae,#2a1a5c)",
    descriptionParagraphs: ["TODO: להוסיף תיאור אמיתי."],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
];

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return competitions.find((c) => c.slug === slug);
}
