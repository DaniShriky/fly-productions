import { GetServerSideProps } from "next";
import { getAllCompetitionSlugs } from "@/lib/queries/competitions";

const SITE_URL = "https://www.fly-festivals.com";

// Server-generated rather than a static public/sitemap.xml file so new
// competitions added in Supabase show up automatically without a separate
// manual step. Submitting this in Google Search Console (or just having it
// exist) helps Google discover the current URLs faster instead of
// continuing to serve the old Wix site's now-404 pages from its old index.
async function generateSitemap() {
  const staticRoutes = ["", "/accessibility"];
  const slugs = await getAllCompetitionSlugs();
  const competitionRoutes = slugs.map((slug) => `/competitions/${slug}`);
  const urls = [...staticRoutes, ...competitionRoutes];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join("\n")}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml");
  res.write(await generateSitemap());
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
