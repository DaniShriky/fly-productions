import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import Hero from "@/components/home/Hero";
import CompetitionCarousel from "@/components/home/CompetitionCarousel";
import TakanonSection from "@/components/home/TakanonSection";
import PriceListSection from "@/components/home/PriceListSection";
import VideoSection from "@/components/home/VideoSection";
import Testimonials from "@/components/home/Testimonials";
import PromoBanner from "@/components/home/PromoBanner";
import { getAllCompetitions } from "@/lib/queries/competitions";
import { getAllTestimonials } from "@/lib/queries/testimonials";

export default function Home({
  competitions,
  testimonials,
}: InferGetStaticPropsType<typeof getStaticProps>) {
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

      <Nav competitions={competitions} />
      <Hero />
      <CompetitionCarousel competitions={competitions} />
      <TakanonSection />
      <PriceListSection />
      <VideoSection />
      <Testimonials testimonials={testimonials} />
      <PromoBanner />
      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const [competitions, testimonials] = await Promise.all([
    getAllCompetitions(),
    getAllTestimonials(),
  ]);

  return { props: { competitions, testimonials } };
};
