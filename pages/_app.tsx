import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";
import AccessibilityWidget from "@/components/shared/AccessibilityWidget";
import "@/styles/globals.css";
// react-easy-crop (PhotoCropModal) ships its own required positioning CSS —
// without it the cropped image never renders (just the empty circle guide).
// Next.js's Pages Router only allows global/node_modules CSS imports here,
// in _app.tsx, not from the component file itself.
import "react-easy-crop/react-easy-crop.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AccessibilityWidget />
      <Analytics />
    </>
  );
}
