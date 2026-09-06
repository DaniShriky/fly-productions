import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="he" dir="rtl">
      <Head>
        {/* Competition pages embed Instagram Reels (see CompetitionDetail) —
            preconnecting shaves the connection setup off that iframe's load,
            since Instagram's embed can't be made to autoplay instantly on
            its own. Remove once those reels are self-hosted as mp4. */}
        <link rel="preconnect" href="https://www.instagram.com" />
        <link rel="dns-prefetch" href="https://www.instagram.com" />

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
