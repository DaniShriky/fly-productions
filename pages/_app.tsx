import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";
import AccessibilityWidget from "@/components/shared/AccessibilityWidget";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AccessibilityWidget />
      <Analytics />
    </>
  );
}
