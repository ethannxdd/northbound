import type { PlanLine } from '@shared/engine'
import { gbp } from '../lib/format'

export type DiffKind = 'match' | 'under' | 'over' | 'only' | 'missing'

/** How your quote compares with the baseline. Differences under 50p count as a match. */
export function diffOf(baselineGbp: number | null, mineGbp: number | null): { kind: DiffKind; gbp: number } {
  if (mineGbp === null) return { kind: 'missing', gbp: 0 }
  if (baselineGbp === null) return { kind: 'only', gbp: mineGbp }
  const d = mineGbp - baselineGbp
  if (Math.abs(d) < 0.5) return { kind: 'match', gbp: 0 }
  return { kind: d < 0 ? 'under' : 'over', gbp: d }
}

export function lineDiff(l: PlanLine) {
  return diffOf(l.baselineGbp, l.mineGbp)
}

/** The difference chip: = Matches, −£38 under, +£100 over, Yours only. */
export function DiffChip({ baselineGbp, mineGbp }: { baselineGbp: number | null; mineGbp: number | null }) {
  const d = diffOf(baselineGbp, mineGbp)
  if (d.kind === 'missing') return null
  if (d.kind === 'match') return <span className="chip-diff">= Matches</span>
  if (d.kind === 'only') return <span className="chip-diff only">Yours only</span>
  if (d.kind === 'under') return <span className="chip-diff under">−{gbp(-d.gbp)} under</span>
  return <span className="chip-diff over">+{gbp(d.gbp)} over</span>
}
