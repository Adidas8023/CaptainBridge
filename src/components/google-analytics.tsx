import Script from "next/script";
export function GoogleAnalytics() {
  return <Script id="abel-ga4" src="/abel-analytics.js" strategy="afterInteractive" />;
}
