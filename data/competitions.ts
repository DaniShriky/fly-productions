import { Competition } from "@/types/competition";

// TODO: this whole file gets deleted once Supabase is connected.
// getStaticProps in pages/index.tsx and pages/competitions/[slug].tsx
// will fetch these same fields from the `competitions` table instead.

export const competitions: Competition[] = [
  {
    id: "1",
    slug: "art-fantasy",
    name: "ART FANTASY",
    date: "8 / 1 / 27",
    location: "היכל התרבות כרמיאל",
    isReligious: false,
    image: "/images/compBtns/art-fantasy.jpg",
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
    slug: "dance-star-international",
    name: "DANCE STAR INTERNATIONAL",
    date: "7-10 / 2 / 27",
    location: "היכל התרבות נס ציונה",
    isReligious: false,
    image: "/images/compBtns/dance-star-international.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">DANCE STAR INTERNATIONAL</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "3",
    slug: "mega-star",
    name: "MEGA STAR",
    date: "26-27 / 2 / 27",
    location: "תיאטרון הצפון קריית חיים",
    isReligious: false,
    image: "/images/compBtns/mega-star.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">MEGA STAR</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "4",
    slug: "mega-star-religious",
    name: "MEGA STAR (מגזר דתי)",
    date: "17-18 / 3 / 27",
    location: "היכל התרבות נס ציונה",
    isReligious: true,
    image: "/images/compBtns/mega-star-religious.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">MEGA STAR</span> (מגזר דתי) מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#3a3fae,#0e1a3a)",
    ],
  },
  {
    id: "5",
    slug: "super-star-eilat",
    name: "SUPER STAR EILAT",
    date: "15-17 / 4 / 27",
    location: "אילת",
    isReligious: false,
    image: "/images/compBtns/super-star-eilat.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">SUPER STAR EILAT</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#8a4fc9,#2d3a8f)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
  {
    id: "6",
    slug: "star-of-the-dance",
    name: "STAR OF THE DANCE",
    date: "5-7 / 5 / 27",
    location: "תיאטרון הצפון קריית חיים",
    isReligious: false,
    image: "/images/compBtns/star-of-the-dance.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">STAR OF THE DANCE</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#ae8a4f,#5c3a1a)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
  {
    id: "7",
    slug: "eilat-dance-international",
    name: "EILAT DANCE INTERNATIONAL",
    date: "27-29 / 5 / 27",
    location: "אילת",
    isReligious: false,
    image: "/images/compBtns/eilat-dance-international.jpg",
    descriptionParagraphs: [
      'פסטיבל <span class="hl">EILAT DANCE INTERNATIONAL</span> מבית <span class="hl">FLY הפקות</span> — TODO: להוסיף תיאור אמיתי.',
    ],
    galleryGradients: [
      "linear-gradient(165deg,#6a4fae,#2a1a5c)",
      "linear-gradient(165deg,#c23a5a,#7a2050)",
      "linear-gradient(165deg,#2a2a2e,#0c0c0e)",
    ],
  },
];

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return competitions.find((c) => c.slug === slug);
}
