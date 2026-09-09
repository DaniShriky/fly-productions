import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import Hero from "@/components/home/Hero";
import CompetitionCarousel from "@/components/home/CompetitionCarousel";
import VideoSection from "@/components/home/VideoSection";
import Testimonials from "@/components/home/Testimonials";
import PromoBanner from "@/components/home/PromoBanner";

export default function Home(_props: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>FLY Productions | תחרויות מחול ושירותי במה</title>
        <meta name="description" content="Fly הפקות אירועים מדהימים" />
        <meta property="og:title" content="FLY Productions | תחרויות מחול ושירותי במה" />
        <meta property="og:description" content="Fly הפקות אירועים מדהימים" />
        <meta property="og:image" content="https://www.fly-festivals.com/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FLY Productions | תחרויות מחול ושירותי במה" />
        <meta name="twitter:description" content="Fly הפקות אירועים מדהימים" />
        <meta name="twitter:image" content="https://www.fly-festivals.com/images/og-image.png" />
      </Head>

      <Nav />
      <Hero />
      <CompetitionCarousel />
      <VideoSection />
      <Testimonials />
      <PromoBanner />
      <Footer />
    </>
  );
}

// Currently a no-op (competitions/testimonials come from the hardcoded
// data/ files, imported directly by each component). Once Supabase is
// connected, fetch the competitions list here and pass it down as props
// instead of importing data/competitions.ts directly in each component —
// that's the only structural change needed.
export const getStaticProps: GetStaticProps = async () => {
  return { props: {} };
};
