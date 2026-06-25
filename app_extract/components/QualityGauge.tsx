interface QualityGaugeProps {
  score: number | null;
  threshold: number;
}

export function QualityGauge({ score, threshold }: QualityGaugeProps) {
  if (score === null) {
    return <span className="font-mono text-xs text-ink/30">—</span>;
  }

  const pct = score / 10;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const passed = score >= threshold;
  const color = passed ? '#3F8F5F' : '#B5503A';

  return (
    <div className="flex items-center gap-2" title={`Quality score ${score}/10 (gate at ${threshold})`}>
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#E6E0D2" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-sm tabular-nums font-semibold" style={{ color }}>
        {score}/10
      </span>
    </div>
  );
}
