import Link from 'next/link';
import Image from 'next/image';
import { Home } from 'lucide-react';
import type { ListingSummary } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

const READINESS: Record<string, { label: string; className: string }> = {
  incomplete:      { label: 'Incomplete',      className: 'bg-hairline text-ink/55' },
  needs_attention: { label: 'Needs attention', className: 'bg-gate-soft text-gate' },
  nearly_ready:    { label: 'Nearly ready',    className: 'bg-analysis-soft text-analysis' },
  ready:           { label: 'Ready',           className: 'bg-approved-soft text-approved' },
};

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const { photoCount, analyzedCount, missingRoomTypes, guidance, photos } = listing as ListingSummary & { photos?: { url: string; isCover?: boolean }[] };
  const progressPct = photoCount > 0 ? Math.round((analyzedCount / photoCount) * 100) : 0;
  const readiness = READINESS[(guidance as { readiness?: string })?.readiness ?? 'incomplete'] ?? READINESS.incomplete;
  const isAnalyzing = analyzedCount < photoCount && photoCount > 0;

  // Find cover photo URL from guidance/costSummary data is not directly available here
  // The cover photo URL is not exposed in ListingSummary so we show a placeholder gradient
  const hasCoverUrl = false;

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group block rounded-xl border border-hairline bg-surface overflow-hidden hover:border-analysis/40 hover:shadow-md transition-all duration-200"
    >
      {/* Cover photo / placeholder */}
      <div className="relative aspect-[4/3] bg-hairline/30 overflow-hidden">
        {hasCoverUrl ? (
          <Image src="" alt={listing.title} fill unoptimized className="object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-analysis-soft to-hairline/50">
            <Home className="h-8 w-8 text-analysis/30" />
          </div>
        )}

        {/* Readiness badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${readiness.className}`}>
            {readiness.label}
          </span>
        </div>

        {/* Photo count badge */}
        {photoCount > 0 && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur font-medium">
              {photoCount} photo{photoCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Analyzing shimmer */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="font-display font-semibold text-base truncate group-hover:text-analysis transition-colors leading-tight">
          {listing.title}
        </p>
        {listing.address && (
          <p className="text-sm text-ink/45 mt-0.5 truncate">{listing.address}</p>
        )}

        {/* Progress bar */}
        {photoCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-ink/40">{analyzedCount}/{photoCount} analyzed</span>
              {progressPct === 100 && (
                <span className="text-[11px] font-semibold text-approved">Complete</span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-hairline overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct === 100 ? 'bg-approved' : isAnalyzing ? 'bg-analysis' : 'bg-analysis/60'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* No photos state */}
        {photoCount === 0 && (
          <p className="text-xs text-ink/35 mt-3">No photos yet — tap to add some</p>
        )}

        {/* Missing rooms */}
        {missingRoomTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {missingRoomTypes.slice(0, 3).map((room) => (
              <span key={room} className="rounded-full bg-gate-soft text-gate text-[11px] font-medium px-2 py-0.5">
                {room}
              </span>
            ))}
            {missingRoomTypes.length > 3 && (
              <span className="text-[11px] text-ink/35 py-0.5">+{missingRoomTypes.length - 3} more</span>
            )}
          </div>
        )}

        {/* All rooms covered */}
        {missingRoomTypes.length === 0 && photoCount > 0 && (
          <p className="text-[11px] font-semibold text-approved mt-3 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All rooms covered
          </p>
        )}
      </div>
    </Link>
  );
}
