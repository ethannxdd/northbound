import { CARD_PAYOFF_MONTHS, repayments } from '@shared/engine'
import { useActions, useApp } from '../lib/app'
import { gbp, zar } from '../lib/format'
import { SavedMoneyField } from '../lib/ui'

/** Loans and credit towards the move. Saved on the profile, so every scenario uses them. */
export default function LoansFields({ compact = false }: { compact?: boolean }) {
  const { profile, borrowing, input, plan } = useApp()
  const { updateProfile } = useActions()
  const r = repayments(borrowing)
  const save = (k: 'loanZar' | 'loanMonths' | 'loanRatePct' | 'cardZar' | 'cardRatePct') => (n: number) => updateProfile({ [k]: n })

  return (
    <div className="loans">
      <div className="loans-grid">
        <SavedMoneyField id="loan" label="Personal loan" value={profile.loanZar ?? 0} onSave={save('loanZar')} />
        <NumberField id="loan-months" label="Over (months)" value={profile.loanMonths ?? 60} min={6} max={120} onSave={save('loanMonths')} />
        <NumberField id="loan-rate" label="Interest a year (%)" value={profile.loanRatePct ?? 0} min={0} max={40} step={0.25} onSave={save('loanRatePct')} />
        <SavedMoneyField id="card" label="Credit card limit you'll use" value={profile.cardZar ?? 0} onSave={save('cardZar')} />
        <NumberField id="card-rate" label="Card interest a year (%)" value={profile.cardRatePct ?? 0} min={0} max={40} step={0.25} onSave={save('cardRatePct')} />
      </div>
      {r.borrowedZar > 0 ? (
        <p className="hint" role="status">
          You'd borrow {zar(r.borrowedZar)}, so you save {zar(plan.saveTargetZar, 100)} yourself instead of {zar(plan.targetZar, 100)}. Repayments: {zar(r.totalZar, 10)} a month ({gbp(r.totalZar / input.rate)}), about {zar(r.interestZar, 100)} in interest. The card is planned as cleared over {CARD_PAYOFF_MONTHS} months.
        </p>
      ) : (
        !compact && <p className="hint">Borrowing lowers what you save, not what the move costs. Repayments are taken off what's left each month in Life.</p>
      )}
    </div>
  )
}

function NumberField({ id, label, value, min, max, step = 1, onSave }: { id: string; label: string; value: number; min: number; max: number; step?: number; onSave: (n: number) => unknown }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        key={value}
        onBlur={(e) => {
          const n = Math.min(max, Math.max(min, Number(e.target.value)))
          if (Number.isFinite(n) && n !== value) void onSave(n)
        }}
      />
    </div>
  )
}
