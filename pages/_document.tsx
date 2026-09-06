import { Html, Head, Main, NextScript } from "next/document";
import { IS_PRIVATE_LINK } from "@/lib/featureFlags";

export default function Document() {
  return (
    <Html lang="he" dir="rtl">
      <Head>
        {/* Keeps the client-link Vercel project out of search while the
            public production project stays indexable (see
            lib/featureFlags.ts) — both now show the registration CTA. */}
        {IS_PRIVATE_LINK && <meta name="robots" content="noindex, nofollow" />}

        {/* Browsers stretch a non-square <link rel="icon"> into the square
            tab-icon slot instead of letterboxing it — fly-logo.png is a
            wide crest, so it needs its own square, padded render here.
            Regenerate with scripts/make-favicon.js if the logo changes. */}
        <link rel="icon" href="/images/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/favicon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
