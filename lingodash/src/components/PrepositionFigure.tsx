import { cn } from '@/lib/cn'

/**
 * 前置詞のイメージ図（日本語を介さず図で覚える）。
 * 灰色 = 基準となる物（箱・面・線）、琥珀色 = 対象（点）と動き（矢印）。
 */
export function PrepositionFigure({ kind, className }: { kind: string; className?: string }) {
  const ref = 'fill-slate-700/60 stroke-slate-400'
  const obj = 'fill-amber-400'
  const arrow = 'stroke-amber-400'
  const box = <rect x="30" y="30" width="60" height="50" rx="4" className={ref} strokeWidth="2" />
  const line = <line x1="15" y1="70" x2="105" y2="70" className={ref} strokeWidth="3" />
  const dot = (cx: number, cy: number, r = 7) => <circle cx={cx} cy={cy} r={r} className={obj} />
  const arr = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} className={arrow} strokeWidth="3" strokeLinecap="round" markerEnd="url(#pp-arrow)" />
  )
  let body: React.ReactNode
  switch (kind) {
    case 'in':
      body = (
        <>
          {box}
          {dot(60, 55)}
        </>
      )
      break
    case 'on':
      body = (
        <>
          {line}
          {dot(60, 62)}
        </>
      )
      break
    case 'at':
      body = (
        <>
          <line x1="20" y1="40" x2="100" y2="40" className={ref} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="20" y1="75" x2="100" y2="75" className={ref} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="60" y1="20" x2="60" y2="95" className={ref} strokeWidth="1" strokeDasharray="3 3" />
          {dot(60, 57, 6)}
          <circle cx="60" cy="57" r="12" fill="none" className={arrow} strokeWidth="2" />
        </>
      )
      break
    case 'under':
      body = (
        <>
          <rect x="25" y="30" width="70" height="14" rx="3" className={ref} strokeWidth="2" />
          {dot(60, 68)}
        </>
      )
      break
    case 'over':
      body = (
        <>
          <rect x="40" y="60" width="40" height="30" rx="3" className={ref} strokeWidth="2" />
          <path d="M15 85 Q60 10 105 85" fill="none" className={arrow} strokeWidth="3" markerEnd="url(#pp-arrow)" />
        </>
      )
      break
    case 'above':
      body = (
        <>
          <rect x="35" y="65" width="50" height="22" rx="3" className={ref} strokeWidth="2" />
          {dot(60, 35)}
        </>
      )
      break
    case 'below':
      body = (
        <>
          <rect x="35" y="25" width="50" height="22" rx="3" className={ref} strokeWidth="2" />
          {dot(60, 78)}
        </>
      )
      break
    case 'between':
      body = (
        <>
          <rect x="15" y="40" width="26" height="36" rx="3" className={ref} strokeWidth="2" />
          <rect x="79" y="40" width="26" height="36" rx="3" className={ref} strokeWidth="2" />
          {dot(60, 58)}
        </>
      )
      break
    case 'among':
      body = (
        <>
          {[
            [25, 35],
            [50, 28],
            [85, 38],
            [30, 70],
            [92, 72],
            [62, 85],
            [45, 55],
            [80, 58],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" className={ref} strokeWidth="1.5" />
          ))}
          {dot(62, 58)}
        </>
      )
      break
    case 'through':
      body = (
        <>
          <rect x="40" y="25" width="40" height="60" rx="4" className={ref} strokeWidth="2" />
          {arr(10, 55, 108, 55)}
        </>
      )
      break
    case 'across':
      body = (
        <>
          <rect x="15" y="45" width="90" height="22" rx="2" className={ref} strokeWidth="2" />
          {arr(60, 95, 60, 18)}
        </>
      )
      break
    case 'along':
      body = (
        <>
          <path d="M10 75 Q60 55 110 75" fill="none" className={ref} strokeWidth="4" />
          <path d="M14 62 Q60 42 104 62" fill="none" className={arrow} strokeWidth="3" markerEnd="url(#pp-arrow)" />
        </>
      )
      break
    case 'into':
      body = (
        <>
          {box}
          {arr(5, 55, 50, 55)}
        </>
      )
      break
    case 'out_of':
      body = (
        <>
          {box}
          {arr(62, 55, 112, 55)}
        </>
      )
      break
    case 'onto':
      body = (
        <>
          {line}
          <path d="M15 30 Q40 25 58 62" fill="none" className={arrow} strokeWidth="3" markerEnd="url(#pp-arrow)" />
        </>
      )
      break
    case 'off':
      body = (
        <>
          {line}
          <path d="M55 64 Q70 20 105 30" fill="none" className={arrow} strokeWidth="3" markerEnd="url(#pp-arrow)" />
        </>
      )
      break
    case 'from_to':
      body = (
        <>
          {dot(20, 55)}
          {arr(32, 55, 96, 55)}
          <circle cx="102" cy="55" r="7" fill="none" className={arrow} strokeWidth="2" />
        </>
      )
      break
    case 'toward':
      body = (
        <>
          <rect x="88" y="35" width="22" height="40" rx="3" className={ref} strokeWidth="2" />
          {arr(10, 55, 66, 55)}
        </>
      )
      break
    case 'by':
      body = (
        <>
          <rect x="30" y="30" width="36" height="50" rx="3" className={ref} strokeWidth="2" />
          {dot(80, 62)}
        </>
      )
      break
    case 'with':
      body = (
        <>
          <circle cx="48" cy="55" r="12" className={ref} strokeWidth="2" />
          {dot(72, 55, 10)}
        </>
      )
      break
    case 'behind':
      body = (
        <>
          {dot(40, 60, 9)}
          <rect x="52" y="30" width="36" height="50" rx="3" className={ref} strokeWidth="2" />
          <circle cx="100" cy="60" r="7" fill="none" className={arrow} strokeWidth="2" />
          <text x="30" y="98" className="fill-slate-400" fontSize="9">
            behind
          </text>
          <text x="86" y="98" className="fill-slate-400" fontSize="9">
            front
          </text>
        </>
      )
      break
    case 'around':
      body = (
        <>
          <rect x="45" y="42" width="30" height="26" rx="3" className={ref} strokeWidth="2" />
          <path d="M60 18 A37 37 0 1 1 25 60" fill="none" className={arrow} strokeWidth="3" markerEnd="url(#pp-arrow)" />
        </>
      )
      break
    default:
      body = dot(60, 55)
  }
  return (
    <svg viewBox="0 0 120 110" className={cn('h-28 w-32', className)} aria-label={kind} role="img">
      <defs>
        <marker id="pp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" className="fill-amber-400" />
        </marker>
      </defs>
      {body}
    </svg>
  )
}
