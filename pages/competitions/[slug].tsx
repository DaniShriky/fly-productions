import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import CompetitionHero from "@/components/competition/CompetitionHero";
import CompetitionDetail from "@/components/competition/CompetitionDetail";
import Gallery from "@/components/competition/Gallery";
import MoreCompetitions from "@/components/competition/MoreCompetitions";
import {
  getAllCompetitions,
  getAllCompetitionSlugs,
  getCompetitionBySlug,
} from "@/lib/queries/competitions";

export default function CompetitionPage({
  competition,
  competitions,
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

      <Nav competitions={competitions} />
      <CompetitionHero competition={competition} />
      <CompetitionDetail competition={competition} />
      <Gallery competition={competition} />
      <MoreCompetitions current={competition} competitions={competitions} />
      <Footer />
    </>
  );
}

// Pre-builds one static page per competition at build time (this is the
// SEO-friendly SSG approach from the architecture doc).
export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await getAllCompetitionSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const [competition, competitions] = await Promise.all([
    getCompetitionBySlug(slug),
    getAllCompetitions(),
  ]);

  if (!competition) {
    return { notFound: true };
  }

  return { props: { competition, competitions } };
};
