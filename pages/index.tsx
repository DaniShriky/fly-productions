import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import Hero from "@/components/home/Hero";
import CompetitionCarousel from "@/components/home/CompetitionCarousel";
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
        <title>FLY Productions | פסטיבלים ותחרויות מחול</title>
        <meta
          name="description"
          content="FLY Productions - הפקת תחרויות ריקוד מובילות בישראל"
        />
      </Head>

      <Nav competitions={competitions} />
      <Hero />
      <CompetitionCarousel competitions={competitions} />
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
