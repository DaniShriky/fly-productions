import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="he" dir="rtl">
      <Head>
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
