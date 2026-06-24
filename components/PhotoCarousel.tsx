'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, RotateCcw, Trash2, ZoomIn, Star, Wand2, Loader2 } from 'lucide-react';
import type { Photo, ToolJob } from '@/lib/types';
import { api, resolvePhotoUrl } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { QualityGauge } from './QualityGauge';
import { BeforeAfterSlider } from './BeforeAfterSlider';

interface PhotoCarouselProps {
  photos: Photo[];
  initialPhotoId?: string | null;
  qualityThreshold: number;
  onClose: () => void;
  onReanalyze: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onSetCover: (photoId: string) => Promise<void>;
  onMove: (photoId: string, direction: -1 | 1) => Promise<void>;
  onRestoreOriginal: (photoId: string) => Promise<void>;
  onReviewFurnishingSuggestion: (photoId: string, decision: 'accept' | 'dismiss') => Promise<void>;
  toolJobs?: ToolJob[];
  onApplySuggestion?: (photoId: string, prompt?: string) => Promise<void>;
  onReviewJob?: (jobId: string, decision: 'accept' | 'reject') => Promise<void>;
  onRetryJob?: (jobId: string) => Promise<void>;
}

export function PhotoCarousel({
  photos,
  initialPhotoId,
  qualityThreshold,
  onClose,
  onReanalyze,
  onDelete,
  onSetCover,
  onMove,
  onRestoreOriginal,
  onReviewFurnishingSuggestion,
  toolJobs,
  onApplySuggestion,
  onReviewJob,
  onRetryJob,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(() => {
    const i = photos.findIndex((p) => p._id === initialPhotoId);
    return i >= 0 ? i : 0;
  });
  const [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [suggestionConfirm, setSuggestionConfirm] = useState(false);

  const photo = photos[index];

  // When switching photos, reset comparison and suggestion confirm
  useEffect(() => {
    setShowComparison(false);
    setSuggestionConfirm(false);
    setOriginalUrl(null);
  }, [index]);

  // Fetch original version when comparison is requested
  useEffect(() => {
    if (!showComparison || !photo?.url.includes('/generated/')) return;
    api.listVersions(photo._id).then((versions) => {
      const orig = versions.find((v) => v.kind === 'original');
      if (orig) setOriginalUrl(resolvePhotoUrl(orig.url));
    }).catch(() => {});
  }, [showComparison, photo?._id, photo?.url]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(photos.length - 1, i + 1)), [photos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { if (zoomed) { setZoomed(false); } else { onClose(); } }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next, zoomed]);

  if (!photo) return null;

  async function handleReanalyze() {
    setBusy(true);
    try { await onReanalyze(photo._id); } finally { setBusy(false); }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(photo._id);
      if (photos.length <= 1) { onClose(); return; }
      setIndex((i) => Math.min(i, photos.length - 2));
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  }

  const hasAnalysis = photo.status === 'analyzed';
  const scoreBreakdown = hasAnalysis ? photo.analysis.scoreBreakdown : null;
  const isGenerated = photo.url.includes('/generated/');
  const hasSuggestion =
    hasAnalysis &&
    photo.analysis.recommendation?.action &&
    photo.analysis.recommendation.action !== 'none' &&
    photo.analysis.recommendation.sellerSuggestion;

  // Find an active tool job for this photo (matched by source URL)
  const activeJob = toolJobs?.find((j) => j.sourceUrl === photo.url);
  const jobReadyWithImage =
    activeJob?.status === 'ready_for_review' &&
    activeJob.resultType === 'image' &&
    activeJob.resultUrl &&
    activeJob.sourceUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Photo detail"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/10">
        <span className="font-mono text-xs text-white/40">
          {index + 1} / {photos.length}
        </span>
        <p className="text-sm font-medium text-white/70 truncate max-w-xs text-center">
          {photo.originalName}
        </p>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image pane */}
        <div className="relative flex-1 flex items-center justify-center bg-black/20">
          {/* Prev */}
          {index > 0 && (
            <button
              onClick={prev}
              className="absolute left-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Before/after slider — when a job result is ready for review */}
          {jobReadyWithImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
              <BeforeAfterSlider
                beforeUrl={resolvePhotoUrl(activeJob!.sourceUrl!)}
                afterUrl={resolvePhotoUrl(activeJob!.resultUrl!)}
              />
              {onReviewJob && (
                <div className="flex gap-3">
                  <button
                    disabled={busy}
                    onClick={() => void run(() => onReviewJob(activeJob!._id, 'accept'))}
                    className="rounded-xl bg-approved px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-approved/85 transition-all"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept this version'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => onReviewJob(activeJob!._id, 'reject'))}
                    className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/70 disabled:opacity-40 hover:bg-white/10 transition-all"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ) : showComparison && originalUrl ? (
            /* Before/after for already-accepted generated photos */
            <div className="w-full h-full flex items-center justify-center p-6">
              <BeforeAfterSlider
                beforeUrl={originalUrl}
                afterUrl={resolvePhotoUrl(photo.url)}
                afterLabel="Current (AI)"
              />
            </div>
          ) : (
            /* Normal image view */
            <div
              className={`relative w-full h-full flex items-center justify-center p-4 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'} transition-transform duration-200`}
              onClick={() => setZoomed((z) => !z)}
            >
              <div
                className={`relative transition-all duration-200 ${zoomed ? 'w-full h-full' : 'max-w-2xl max-h-full w-full'}`}
                style={{ aspectRatio: zoomed ? undefined : '4/3' }}
              >
                <Image
                  src={resolvePhotoUrl(photo.url)}
                  alt={photo.originalName}
                  fill
                  unoptimized
                  className="object-contain"
                  priority
                />
              </div>

              {/* Suggestion overlay on image */}
              {hasSuggestion && !activeJob && !suggestionConfirm && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 py-5 pointer-events-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-end justify-between gap-4 pointer-events-auto">
                    <div>
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">
                        AI Suggestion
                      </p>
                      <p className="text-sm text-white leading-snug max-w-md">
                        {photo.analysis.recommendation.sellerSuggestion}
                      </p>
                    </div>
                    {onApplySuggestion && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSuggestionConfirm(true); }}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-analysis px-4 py-2.5 text-xs font-semibold text-white hover:bg-analysis/85 transition-all shadow-lg"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Apply AI
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Suggestion confirm step */}
              {hasSuggestion && suggestionConfirm && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-2xl bg-ink border border-white/10 p-6 max-w-sm w-full mx-4 text-center">
                    <div className="flex h-12 w-12 mx-auto mb-3 items-center justify-center rounded-xl bg-analysis-soft">
                      <Wand2 className="h-6 w-6 text-analysis" />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Apply AI enhancement?</p>
                    <p className="text-xs text-white/50 leading-relaxed mb-5">
                      {photo.analysis.recommendation.action?.replace(/_/g, ' ')} will be applied. The original is preserved and you can review the result before it replaces anything.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSuggestionConfirm(false)}
                        disabled={busy}
                        className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setSuggestionConfirm(false);
                          void run(() => onApplySuggestion!(photo._id));
                        }}
                        className="flex-1 rounded-xl bg-analysis py-2.5 text-xs font-semibold text-white hover:bg-analysis/85 disabled:opacity-50 transition-all"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : 'Generate'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Badges overlaid (when not in slider/confirm mode) */}
          {!jobReadyWithImage && !showComparison && (
            <div className="absolute top-5 left-5 flex flex-col gap-2 pointer-events-none">
              <StatusBadge status={photo.status} />
              {photo.isCover && (
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  Cover
                </span>
              )}
            </div>
          )}

          {/* Zoom hint */}
          {!jobReadyWithImage && !showComparison && !zoomed && !suggestionConfirm && (
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/60 backdrop-blur">
                <ZoomIn className="h-3 w-3" />
                Click to zoom
              </span>
            </div>
          )}

          {/* Next */}
          {index < photos.length - 1 && (
            <button
              onClick={next}
              className="absolute right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="hidden md:flex flex-col w-72 shrink-0 border-l border-white/10 bg-ink overflow-y-auto">
          <div className="flex flex-col gap-5 p-5">
            {hasAnalysis && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-0.5">Room type</p>
                  <p className="text-sm font-semibold text-white">
                    {photo.analysis.roomType ?? 'Unclassified'}
                  </p>
                </div>
                <QualityGauge score={photo.analysis.qualityScore} threshold={qualityThreshold} />
              </div>
            )}

            {hasAnalysis && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-1">Enhancement gate</p>
                <span className={`text-sm font-semibold ${
                  photo.enhancementGate === 'approved' ? 'text-approved' :
                  photo.enhancementGate === 'skipped' ? 'text-skip' : 'text-white/40'
                }`}>
                  {photo.enhancementGate === 'approved' ? 'Approved'
                   : photo.enhancementGate === 'skipped' ? 'Skipped — below gate'
                   : 'Pending'}
                </span>
              </div>
            )}

            {hasAnalysis && photo.analysis.issues.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-1.5">Issues</p>
                <ul className="flex flex-col gap-1">
                  {photo.analysis.issues.map((iss) => (
                    <li key={iss} className="text-xs text-white/60 leading-snug flex items-start gap-1.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gate shrink-0" />
                      {iss}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Furnishing suggestion */}
            {photo.furnishingSuggestion?.generatedAt && (
              <div className="rounded-xl border border-approved/25 bg-approved-soft/10 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-approved">
                    Furniture suggestion{photo.furnishingSuggestion.style ? ` · ${photo.furnishingSuggestion.style}` : ''}
                  </p>
                  {photo.furnishingSuggestion.status !== 'suggested' && (
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      {photo.furnishingSuggestion.status}
                    </span>
                  )}
                </div>
                {photo.furnishingSuggestion.summary && (
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">{photo.furnishingSuggestion.summary}</p>
                )}
                {photo.furnishingSuggestion.pieces.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {photo.furnishingSuggestion.pieces.map((piece, i) => (
                      <li key={i} className="rounded-md bg-white/5 px-2.5 py-2">
                        <p className="text-[11px] font-semibold text-white/80">{piece.item}</p>
                        {piece.placement && <p className="mt-0.5 text-[10px] text-white/50">{piece.placement}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {photo.furnishingSuggestion.status === 'suggested' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => void run(() => onReviewFurnishingSuggestion(photo._id, 'accept'))}
                      className="flex-1 rounded-lg bg-approved px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                    >
                      Accept
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void run(() => onReviewFurnishingSuggestion(photo._id, 'dismiss'))}
                      className="flex-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Score breakdown */}
            {scoreBreakdown && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-2">Score breakdown</p>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ['Lighting',    scoreBreakdown.lighting],
                      ['Sharpness',   scoreBreakdown.sharpness],
                      ['Composition', scoreBreakdown.composition],
                      ['Cleanliness', scoreBreakdown.cleanliness],
                      ['Readiness',   scoreBreakdown.listingReadiness],
                    ] as [string, number | null][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/40 w-20 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-analysis transition-all"
                          style={{ width: val != null ? `${val * 10}%` : '0%' }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-white/50 tabular-nums w-6 text-right">
                        {val ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasAnalysis && photo.analysis.reasoning && (
              <div>
                <p className="text-xs font-semibold text-white/50 mb-1.5">Reasoning</p>
                <blockquote className="border-l-2 border-white/15 pl-2.5 text-xs text-white/40 italic leading-relaxed">
                  {photo.analysis.reasoning}
                </blockquote>
              </div>
            )}

            {photo.status === 'failed' && (
              <div className="rounded-xl bg-skip-soft border border-skip/25 px-3 py-2.5">
                <p className="text-xs text-skip leading-snug">{photo.errorMessage || 'Analysis failed.'}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              {isGenerated && (
                <button
                  onClick={() => setShowComparison((s) => !s)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {showComparison ? 'Hide comparison' : 'Compare with original'}
                </button>
              )}
              {!photo.isCover && (
                <button
                  onClick={() => void run(() => onSetCover(photo._id))}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-all"
                >
                  <Star className="h-3.5 w-3.5" />
                  Use as cover
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void run(() => onMove(photo._id, -1))}
                  disabled={busy || index === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Move earlier
                </button>
                <button
                  onClick={() => void run(() => onMove(photo._id, 1))}
                  disabled={busy || index === photos.length - 1}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  Move later
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {isGenerated && (
                <button
                  onClick={() => void run(() => onRestoreOriginal(photo._id))}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl border border-gate/30 px-3 py-2 text-xs font-semibold text-gate/80 hover:bg-gate/10 hover:text-gate disabled:opacity-40 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore original
                </button>
              )}
              <button
                onClick={handleReanalyze}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {busy ? 'Working…' : 'Re-run analysis'}
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-skip/30 px-3 py-2 text-xs font-semibold text-skip/80 hover:bg-skip/10 hover:text-skip disabled:opacity-40 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove photo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom strip */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 border-t border-white/10 shrink-0 bg-ink">
        {hasAnalysis ? (
          <div className="flex items-center gap-3">
            <QualityGauge score={photo.analysis.qualityScore} threshold={qualityThreshold} />
            <div>
              <p className="text-xs font-semibold text-white">{photo.analysis.roomType ?? 'Unclassified'}</p>
              {photo.analysis.issues.length > 0 && (
                <p className="text-[11px] text-white/40">{photo.analysis.issues[0]}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-white/40">
            {photo.status === 'pending' ? 'Analyzing…' : photo.errorMessage || 'No analysis'}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button onClick={handleReanalyze} disabled={busy} className="h-8 w-8 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:bg-white/10 disabled:opacity-40 transition-colors" aria-label="Re-analyze">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDelete} disabled={busy} className="h-8 w-8 flex items-center justify-center rounded-full border border-skip/30 text-skip/80 hover:bg-skip/10 disabled:opacity-40 transition-colors" aria-label="Delete photo">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
