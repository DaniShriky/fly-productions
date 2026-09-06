import { Html, Head, Main, NextScript } from "next/document";
import { SHOW_REGISTRATION } from "@/lib/featureFlags";

export default function Document() {
  return (
    <Html lang="he" dir="rtl">
      <Head>
        {/* This flag is also what shows/hides the Nav's registration CTA
            (see lib/featureFlags.ts) — the client-link deployment that has
            the button stays out of search, the public production domain
            doesn't. */}
        {SHOW_REGISTRATION && <meta name="robots" content="noindex, nofollow" />}

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
