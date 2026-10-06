import { SKILLS, SKILL_JA, type Skill } from '@/lib/types'

/** 7 スキルのレーダー。値は 0〜1。単一系列・単一色。 */
export function SkillRadar({ scores, size = 240, compare }: { scores: Record<Skill, number>; size?: number; compare?: Record<Skill, number> }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 34
  const n = SKILLS.length
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const
  }
  const poly = (vals: Record<Skill, number>) => SKILLS.map((s, i) => pt(i, Math.max(0.02, Math.min(1, vals[s] ?? 0))).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="スキル別レーダー">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon key={g} points={SKILLS.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" className="stroke-slate-700" strokeWidth="1" />
      ))}
      {SKILLS.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-slate-800" strokeWidth="1" />
      })}
      {compare && <polygon points={poly(compare)} fill="none" className="stroke-slate-400" strokeWidth="2" strokeDasharray="4 3" />}
      <polygon points={poly(scores)} className="fill-blue-400/25 stroke-blue-400" strokeWidth="2" />
      {SKILLS.map((s, i) => {
        const [x, y] = pt(i, scores[s] ?? 0)
        return <circle key={s} cx={x} cy={y} r="4" className="fill-blue-400 stroke-slate-950" strokeWidth="2" />
      })}
      {SKILLS.map((s, i) => {
        const [x, y] = pt(i, 1.22)
        return (
          <text key={s} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-300" fontSize="11">
            {SKILL_JA[s]}
          </text>
        )
      })}
    </svg>
  )
}
