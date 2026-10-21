import type { StrategyGuideEntry } from '@/content/strategies';

/** Small hand-drawn charts that show the price pattern each strategy looks for. */
export function PatternArt({ pattern }: { pattern: StrategyGuideEntry['pattern'] }) {
  return (
    <svg viewBox="0 0 240 110" className="h-28 w-full" role="img" aria-hidden>
      <rect x="0" y="0" width="240" height="110" rx="12" className="fill-muted/60" />
      {pattern === 'trend' && <Trend />}
      {pattern === 'bounce' && <Bounce />}
      {pattern === 'breakout' && <Breakout />}
      {pattern === 'arb' && <Arb />}
      {pattern === 'auto' && <Auto />}
    </svg>
  );
}

const Dot = ({ x, y, buy }: { x: number; y: number; buy: boolean }) => (
  <g>
    <circle cx={x} cy={y} r="6" className={buy ? 'fill-win' : 'fill-loss'} />
    <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-white">
      {buy ? 'B' : 'S'}
    </text>
  </g>
);

function Trend() {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline
        points="10,80 30,84 50,78 70,82 90,70 110,62 130,66 150,50 170,42 190,46 210,30 230,24"
        className="stroke-foreground/70"
        strokeWidth="2"
      />
      <path d="M10,84 C60,82 100,66 230,30" className="stroke-warn" strokeWidth="2.5" />
      <path d="M10,78 C70,80 120,72 230,44" className="stroke-primary" strokeWidth="2.5" />
      <Dot x={88} y={74} buy />
    </g>
  );
}

function Bounce() {
  return (
    <g fill="none" strokeLinecap="round">
      <path
        d="M10,30 C60,30 180,30 230,30"
        className="stroke-muted-foreground"
        strokeDasharray="4 4"
        strokeWidth="1.5"
      />
      <path d="M10,55 C60,55 180,55 230,55" className="stroke-muted-foreground" strokeWidth="1.5" />
      <path
        d="M10,80 C60,80 180,80 230,80"
        className="stroke-muted-foreground"
        strokeDasharray="4 4"
        strokeWidth="1.5"
      />
      <polyline
        points="10,50 30,40 50,58 70,70 90,88 110,74 130,58 150,52 170,40 190,56 210,66 230,58"
        className="stroke-foreground/70"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Dot x={90} y={88} buy />
      <Dot x={130} y={58} buy={false} />
    </g>
  );
}

function Breakout() {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect
        x="14"
        y="52"
        width="140"
        height="34"
        rx="4"
        className="fill-primary/10 stroke-primary/40"
      />
      <path d="M14,52 L230,52" className="stroke-primary" strokeDasharray="5 4" strokeWidth="1.5" />
      <polyline
        points="14,70 34,60 54,80 74,62 94,78 114,58 134,74 154,60 174,40 194,30 214,22 230,16"
        className="stroke-foreground/70"
        strokeWidth="2"
      />
      <Dot x={174} y={40} buy />
    </g>
  );
}

function Arb() {
  return (
    <g fill="none" strokeLinecap="round">
      <polyline
        points="10,44 60,40 110,46 160,38 230,42"
        className="stroke-loss"
        strokeWidth="2.5"
      />
      <polyline
        points="10,70 60,66 110,72 160,64 230,68"
        className="stroke-win"
        strokeWidth="2.5"
      />
      <path d="M160,46 L160,60" className="stroke-foreground" strokeWidth="1.5" />
      <text x="168" y="57" fontSize="9" className="fill-muted-foreground">
        gap
      </text>
      <text x="12" y="36" fontSize="9" className="fill-muted-foreground">
        Exchange A
      </text>
      <text x="12" y="88" fontSize="9" className="fill-muted-foreground">
        Exchange B
      </text>
      <Dot x={160} y={64} buy />
      <Dot x={160} y={38} buy={false} />
    </g>
  );
}

function Auto() {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M80,10 L80,100 M160,10 L160,100"
        className="stroke-border"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <polyline points="10,84 30,74 50,66 70,52 80,48" className="stroke-win" strokeWidth="2.5" />
      <polyline
        points="80,48 95,62 110,44 125,62 140,46 160,58"
        className="stroke-primary"
        strokeWidth="2.5"
      />
      <polyline
        points="160,58 175,55 190,57 205,55 215,40 230,22"
        className="stroke-warn"
        strokeWidth="2.5"
      />
      <text x="45" y="104" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        📈 trend
      </text>
      <text x="120" y="104" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        ↔️ sideways
      </text>
      <text x="200" y="104" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        🫧 squeeze
      </text>
    </g>
  );
}
