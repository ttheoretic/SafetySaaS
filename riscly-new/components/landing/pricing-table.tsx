import { Check, Minus } from 'lucide-react'
import {
  plans,
  comparison,
  type PlanId,
  type FeatureRow,
} from '@/lib/pricing-data'
import { cn } from '@/lib/utils'

const planIds: PlanId[] = ['starter', 'growth', 'pro', 'enterprise']

export function PricingTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-panel">
            <th className="sticky left-0 z-10 bg-panel px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Features
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                className={cn(
                  'px-4 py-3 text-left',
                  plan.highlight && 'bg-primary/5',
                )}
              >
                <div className="text-sm font-semibold text-foreground">
                  {plan.name}
                </div>
                <div className="text-xs font-normal text-muted-foreground">
                  {plan.price}
                  {plan.priceSuffix}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.map((group) => (
            <FeatureGroupRows key={group.category} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FeatureGroupRows({
  group,
}: {
  group: { category: string; rows: FeatureRow[] }
}) {
  return (
    <>
      <tr className="border-b border-border bg-background">
        <td
          colSpan={planIds.length + 1}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary"
        >
          {group.category}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr
          key={row.label}
          className="border-b border-border/60 last:border-0 hover:bg-panel/40"
        >
          <td className="sticky left-0 z-10 bg-background px-4 py-3 text-muted-foreground">
            {row.label}
          </td>
          {planIds.map((id) => (
            <td
              key={id}
              className={cn('px-4 py-3', id === 'pro' && 'bg-primary/5')}
            >
              <CellValue value={row.values[id]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="size-4 text-ok" />
  }
  if (value === false) {
    return <Minus className="size-4 text-muted-foreground/40" />
  }
  return <span className="text-foreground">{value}</span>
}
