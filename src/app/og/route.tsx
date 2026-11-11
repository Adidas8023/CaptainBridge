import { ImageResponse } from 'next/og';

// Static social preview (no query parameters), so Next prerenders it at build
// time and the Worker serves a file. Latin text only: the bundled font has no
// CJK glyphs and the image must render without network access.
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #f4fbe8 0%, #e6f6cf 55%, #d2efa9 100%)',
          color: '#0f172a',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
          <span style={{ color: '#5aa400' }}>CAPTAIN&apos;S</span>
          <span style={{ marginLeft: 12 }}>BRIDGE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Cross-chain USDC transfers</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 34, color: '#334155' }}>
            Native USDC with Circle CCTP V2. No extra platform fee.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#475569' }}>
          <span>Ethereum, Arbitrum, Base, Solana and more</span>
          <span>bridge.abelai.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
