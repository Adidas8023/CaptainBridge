// Only fixed feature names and aggregate results; never pass user content.
export function track(name: string, params: Record<string, string | number> = {}) {
  try {
    if (typeof window === 'undefined' || !['abelai.app', 'www.abelai.app', 'promptvault.abelai.app', 'bridge.abelai.app', 'ucard.abelai.app', 'capymark.abelai.app'].includes(window.location.hostname)) return;
    const w = window as Window & { abelTrack?: (name: string, params: Record<string, string | number>) => void; abelAnalyticsQueue?: [string, Record<string, string | number>][] };
    if (w.abelTrack) w.abelTrack(name, params);
    else { const queue = w.abelAnalyticsQueue ??= []; if (queue.length < 100) queue.push([name, params]); }
  } catch { /* Never interrupt a user operation for analytics. */ }
}
