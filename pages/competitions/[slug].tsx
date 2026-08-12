import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import CompetitionHero from "@/components/competition/CompetitionHero";
import CompetitionDetail from "@/components/competition/CompetitionDetail";
import Gallery from "@/components/competition/Gallery";
import MoreCompetitions from "@/components/competition/MoreCompetitions";
import { competitions, getCompetitionBySlug } from "@/data/competitions";

export default function CompetitionPage({
  competition,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{competition.name} - FLY Productions</title>
        <meta
          name="description"
          content={`${competition.name} - ${competition.date} - ${competition.location}`}
        />
      </Head>

      <Nav />
      <CompetitionHero competition={competition} />
      <CompetitionDetail competition={competition} />
      <Gallery competition={competition} />
      <MoreCompetitions current={competition} />
      <Footer />
    </>
  );
}

// Pre-builds one static page per competition at build time (this is the
// SEO-friendly SSG approach from the architecture doc). Once connected to
// Supabase, this should fetch all slugs from the `competitions` table
// instead of importing the hardcoded array.
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: competitions.map((c) => ({ params: { slug: c.slug } })),
    fallback: false,
  };
};

// Same idea — swap this body for a Supabase query by slug later;
// everything else on this page stays exactly the same.
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const competition = getCompetitionBySlug(slug);

  if (!competition) {
    return { notFound: true };
  }

  return { props: { competition } };
};
