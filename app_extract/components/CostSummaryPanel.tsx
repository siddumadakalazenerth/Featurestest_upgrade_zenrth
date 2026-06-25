import type { CostSummary } from '@/lib/types';

function formatInr(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export function CostSummaryPanel({ cost }: { cost: CostSummary }) {
  const rows = [
    { label: 'Baseline — enhance every photo', value: cost.baselineEnhancementCostInr, emphasis: false },
    { label: 'Gemini analysis pass', value: cost.analysisCostInr, emphasis: false },
    { label: 'With analysis-first filter', value: cost.filteredEnhancementCostInr, emphasis: true },
  ];

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-display text-sm font-semibold">Cost estimate</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {cost.analyzedPhotos}/{cost.totalPhotos} analyzed · gate at {cost.qualityThreshold}/10
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold text-approved tabular-nums">
            {cost.estimatedReductionPct.toFixed(0)}%
          </p>
          <p className="text-[11px] text-ink/40">saved</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {rows.map((row) => (
          <div key={row.label} className={`flex items-baseline justify-between py-2 ${row.emphasis ? 'border-t border-hairline pt-3 mt-1' : ''}`}>
            <span className={`text-sm ${row.emphasis ? 'font-semibold text-ink' : 'text-ink/55'}`}>{row.label}</span>
            <span className={`font-mono text-sm tabular-nums ${row.emphasis ? 'font-bold text-ink' : 'text-ink/55'}`}>
              {formatInr(row.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-3 border-t border-hairline text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-approved" />
          <span className="text-ink/55"><span className="font-semibold text-approved">{cost.approvedForEnhancement}</span> approved</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-skip" />
          <span className="text-ink/55"><span className="font-semibold text-skip">{cost.skippedByQualityGate}</span> skipped by gate</span>
        </span>
      </div>
    </div>
  );
}
