import { ImageResponse } from 'workers-og';

export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (r: Request) => Promise<Response> } }): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/og') {
      const score = Math.max(0, Math.floor(Number(url.searchParams.get('score')) || 0));
      const streak = Math.max(0, Math.floor(Number(url.searchParams.get('streak')) || 0));
      const mode = url.searchParams.get('mode');
      const level = url.searchParams.get('level');
      const modeLabel = mode === '1' ? (level ? `ARCADE MODE · LV ${level}` : 'ARCADE MODE') : 'CLASSIC MODE';

      const body = (
        <div
          style={{
            width: 1200,
            height: 630,
            background: 'linear-gradient(135deg, #030712 0%, #070e20 50%, #0a1225 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 52, color: '#00e676', letterSpacing: 6, marginBottom: 8 }}>BASE BLOCK</div>
          <div style={{ fontSize: 18, color: '#9bc1ff', letterSpacing: 4, marginBottom: 8 }}>ON BASE NETWORK 🔵</div>
          <div style={{ fontSize: 16, color: '#00e5ff', letterSpacing: 3, marginBottom: 20 }}>{modeLabel}</div>
          <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: 4, marginBottom: 8 }}>{score.toLocaleString()}</div>
          <div style={{ fontSize: 18, color: '#94a3b8', letterSpacing: 3, marginBottom: 16 }}>FINAL SCORE</div>
          <div style={{ fontSize: 28, color: '#ffea00', letterSpacing: 3 }}>
            {streak > 0 ? `STREAK ${streak}x` : 'PUZZLE CHAMPION'}
          </div>
        </div>
      );

      return new ImageResponse(body, {
        width: 1200,
        height: 630,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
