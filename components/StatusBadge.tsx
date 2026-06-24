import type { PhotoStatus } from '@/lib/types';

const STYLES: Record<PhotoStatus, { label: string; className: string }> = {
  pending:  { label: 'Analyzing…', className: 'bg-black/60 text-white backdrop-blur' },
  analyzed: { label: 'Analyzed',   className: 'bg-analysis/90 text-white backdrop-blur' },
  failed:   { label: 'Failed',     className: 'bg-skip/90 text-white backdrop-blur' },
};

export function StatusBadge({ status }: { status: PhotoStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.className}`}>
      {status === 'pending' && (
        <span className="h-2 w-2 rounded-full border border-white/60 border-t-transparent animate-spin shrink-0" />
      )}
      {s.label}
    </span>
  );
}
