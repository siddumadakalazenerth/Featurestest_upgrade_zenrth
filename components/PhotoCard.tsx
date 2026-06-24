'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { Photo } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { QualityGauge } from './QualityGauge';

interface PhotoCardProps {
  photo: Photo;
  qualityThreshold: number;
  onReanalyze: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
}

const GATE_COPY: Record<Photo['enhancementGate'], { label: string; className: string }> = {
  pending:  { label: 'Awaiting analysis',           className: 'text-ink/40' },
  approved: { label: 'Approved for enhancement',    className: 'text-approved font-semibold' },
  skipped:  { label: 'Skipped — below quality gate', className: 'text-skip' },
};

export function PhotoCard({ photo, qualityThreshold, onReanalyze, onDelete }: PhotoCardProps) {
  const [busy, setBusy] = useState(false);
  const gate = GATE_COPY[photo.enhancementGate];

  async function handleReanalyze() {
    setBusy(true);
    try { await onReanalyze(photo._id); } finally { setBusy(false); }
  }

  async function handleDelete() {
    setBusy(true);
    try { await onDelete(photo._id); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      <div className="relative w-full aspect-[4/3] bg-hairline/40">
        <Image
          src={resolvePhotoUrl(photo.url)}
          alt={photo.originalName}
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute top-2 left-2">
          <StatusBadge status={photo.status} />
        </div>
        {photo.isCover && (
          <div className="absolute top-2 right-2">
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              Cover
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <p className="font-mono text-[11px] text-ink/35 truncate" title={photo.originalName}>
          {photo.originalName}
        </p>

        {photo.status === 'analyzed' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-sm">
                {photo.analysis.roomType ?? 'Unclassified'}
              </span>
              <QualityGauge score={photo.analysis.qualityScore} threshold={qualityThreshold} />
            </div>
            <p className={`text-xs ${gate.className}`}>{gate.label}</p>
            {photo.analysis.issues.length > 0 && (
              <p className="text-xs text-ink/50 leading-snug">{photo.analysis.issues.join(' · ')}</p>
            )}
            {photo.analysis.reasoning && (
              <blockquote className="border-l-2 border-hairline pl-2.5 text-xs text-ink/40 leading-snug italic">
                {photo.analysis.reasoning}
              </blockquote>
            )}
          </>
        )}

        {photo.status === 'failed' && (
          <p className="text-xs text-skip leading-snug bg-skip-soft rounded-lg px-3 py-2">
            {photo.errorMessage || 'Analysis failed.'}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <button
            onClick={handleReanalyze}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs font-medium text-analysis hover:underline disabled:opacity-40 transition-opacity"
          >
            <RotateCcw className="h-3 w-3" />
            {busy ? 'Working…' : 'Re-run analysis'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-ink/35 hover:text-skip disabled:opacity-40 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
