// Base Block — dynamic OG score-card image endpoint (Area 3.5).
// Returns an SVG rendered as image/svg+xml so shared links preview as a card
// instead of a bare URL. No canvas/WebGL dependency.
const SITE_URL = 'https://base-block.biz.id';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function ogSvg(score: number, streak: number, mode?: string, level?: number): string {
  const scoreText = esc(Number(score).toLocaleString());
  const streakText = streak > 0 ? `STREAK ${streak}x` : 'PUZZLE CHAMPION';
  const modeText = mode ? (mode === '1' || mode.toLowerCase() === 'arcade' ? `ARCADE MODE${level ? ` · LV ${level}` : ''}` : 'CLASSIC MODE') : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="50%" stop-color="#070e20"/>
      <stop offset="100%" stop-color="#0a1225"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0052ff"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="28" fill="none" stroke="url(#accent)" stroke-width="4" opacity="0.8"/>
  <circle cx="100" cy="100" r="16" fill="#0052ff" />
  <circle cx="100" cy="100" r="8" fill="#ffffff" />
  <text x="600" y="160" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="52" fill="#00e676" letter-spacing="6">BASE BLOCK</text>
  <text x="600" y="210" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="18" fill="#9bc1ff" letter-spacing="4">ON BASE NETWORK 🔵</text>
  ${modeText ? `<text x="600" y="260" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="16" fill="#00e5ff" letter-spacing="3">${esc(modeText)}</text>` : ''}
  <text x="600" y="400" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="130" fill="#ffffff" letter-spacing="4">${scoreText}</text>
  <text x="600" y="460" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="18" fill="#94a3b8" letter-spacing="3">FINAL SCORE</text>
  <text x="600" y="530" text-anchor="middle" font-family="'Press Start 2P','Courier New',monospace" font-size="28" fill="#ffea00" letter-spacing="3">${esc(streakText)}</text>
</svg>`;
}

export function renderOgImage(score: number, streak: number, mode?: string, level?: number): Response {
  const svg = ogSvg(score, streak, mode, level);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

// Vercel serverless function entry: GET /api/og?score=..&streak=..&mode=..&level=..
export default function handler(req: { url: string }): Response {
  try {
    const u = new URL(req.url, SITE_URL);
    const score = Math.max(0, Math.floor(Number(u.searchParams.get('score')) || 0));
    const streak = Math.max(0, Math.floor(Number(u.searchParams.get('streak')) || 0));
    const mode = u.searchParams.get('mode') || undefined;
    const level = u.searchParams.has('level') ? Math.floor(Number(u.searchParams.get('level'))) : undefined;
    return renderOgImage(score, streak, mode, level);
  } catch {
    return renderOgImage(0, 0);
  }
}
