interface PipelineStripProps {
  totalPhotos: number;
  analyzedPhotos: number;
  approvedForEnhancement: number;
  skippedByQualityGate: number;
}

interface Stage {
  index: string;
  label: string;
  detail: string;
  count: number;
}

export function PipelineStrip({
  totalPhotos,
  analyzedPhotos,
  approvedForEnhancement,
  skippedByQualityGate,
}: PipelineStripProps) {
  const stages: Stage[] = [
    { index: '01', label: 'Uploaded', detail: 'raw original stored', count: totalPhotos },
    { index: '02', label: 'Gemini analysis', detail: 'room type · quality · suitability', count: analyzedPhotos },
    { index: '03', label: 'Quality gate', detail: 'skipped below threshold', count: skippedByQualityGate },
    { index: '04', label: 'Enhancement queue', detail: 'approved to proceed', count: approvedForEnhancement },
  ];

  return (
    <div className="rounded-xl bg-panel px-6 py-7 sm:px-8 sm:py-8 overflow-x-auto">
      <div className="flex items-stretch gap-0 min-w-[640px]">
        {stages.map((stage, i) => (
          <div key={stage.index} className="flex items-stretch flex-1">
            <div className="flex flex-col flex-1 min-w-[140px]">
              <span className="font-mono text-[11px] text-white/40 tracking-widest">{stage.index}</span>
              <span className="font-display text-2xl text-white mt-2 tabular-nums font-bold">{stage.count}</span>
              <span className="text-sm text-white/90 mt-3 font-medium">{stage.label}</span>
              <span className="font-mono text-[11px] text-white/40 mt-1 leading-snug">{stage.detail}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center px-2 sm:px-4">
                <svg width="28" height="10" viewBox="0 0 28 10" fill="none" className="text-white/25">
                  <line x1="0" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M18 1L23 5L18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
