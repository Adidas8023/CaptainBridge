// Thin bridge to the shared AbelAI GA4 tracker (public/abel-analytics.js).
// Only fixed feature names and aggregate results; never pass addresses,
// amounts, transaction hashes or any other user content.
const SITES = ['abelai.app', 'www.abelai.app', 'promptvault.abelai.app', 'bridge.abelai.app', 'ucard.abelai.app', 'capymark.abelai.app'];

type Params = Record<string, string | number>;
type AnalyticsWindow = Window & {
  abelTrack?: (name: string, params: Params) => void;
  abelAnalyticsQueue?: [string, Params][];
};

export function track(name: string, params: Params = {}) {
  try {
    if (typeof window === 'undefined' || !SITES.includes(window.location.hostname)) return;
    const w = window as AnalyticsWindow;
    if (w.abelTrack) w.abelTrack(name, params);
    else {
      const queue = (w.abelAnalyticsQueue ??= []);
      if (queue.length < 100) queue.push([name, params]);
    }
  } catch {
    /* Never interrupt a wallet or bridge operation for analytics. */
  }
}
