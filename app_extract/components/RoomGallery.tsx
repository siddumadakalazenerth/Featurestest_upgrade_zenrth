'use client';

import Image from 'next/image';
import type { Photo, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

interface RoomGalleryProps {
  photos: Photo[];
  onSelectPhoto: (photoId: string) => void;
  toolJobs?: ToolJob[];
  selectedPhotoIds?: Set<string>;
  onToggleSelect?: (photoId: string) => void;
}

function qualityColor(score: number | null): string {
  if (score == null) return 'text-ink/30';
  if (score >= 7) return 'text-approved';
  if (score >= 5) return 'text-analysis';
  return 'text-gate';
}

export function RoomGallery({ photos, onSelectPhoto, toolJobs, selectedPhotoIds, onToggleSelect }: RoomGalleryProps) {
  if (photos.length === 0) return null;

  const pending   = photos.filter((p) => p.status === 'pending');
  const failed    = photos.filter((p) => p.status === 'failed');
  const analyzed  = photos.filter((p) => p.status === 'analyzed');

  // Group analyzed photos by room type
  const byRoom = new Map<string, Photo[]>();
  for (const photo of analyzed) {
    const room = photo.analysis?.roomType ?? 'Unclassified';
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(photo);
  }

  const roomEntries = Array.from(byRoom.entries()).sort(([a], [b]) => a.localeCompare(b));

  const sharedProps = { toolJobs, selectedPhotoIds, onToggleSelect, onSelectPhoto };

  return (
    /* Single horizontal scroll — all categories side by side */
    <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
      {/* Pending / analyzing */}
      {pending.length > 0 && (
        <RoomColumn title="Analyzing" badge={pending.length} badgeColor="analysis" photos={pending} {...sharedProps} />
      )}

      {/* Grouped by room type */}
      {roomEntries.map(([room, roomPhotos]) => (
        <RoomColumn key={room} title={room} badge={roomPhotos.length} photos={roomPhotos} {...sharedProps} />
      ))}

      {/* Failed */}
      {failed.length > 0 && (
        <RoomColumn title="Failed" badge={failed.length} badgeColor="skip" photos={failed} {...sharedProps} />
      )}
    </div>
  );
}

function RoomColumn({
  title,
  badge,
  badgeColor = 'ink',
  photos,
  toolJobs,
  selectedPhotoIds,
  onToggleSelect,
  onSelectPhoto,
}: {
  title: string;
  badge: number;
  badgeColor?: string;
  photos: Photo[];
  toolJobs?: ToolJob[];
  selectedPhotoIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectPhoto: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Category header */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-ink/70 whitespace-nowrap">{title}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
          ${badgeColor === 'analysis' ? 'bg-analysis-soft text-analysis' :
            badgeColor === 'skip'     ? 'bg-skip-soft text-skip' :
            'bg-paper text-ink/40 border border-hairline'}`}>
          {badge}
        </span>
      </div>

      {/* Photos side by side */}
      <div className="flex gap-2">
        {photos.map((photo) => (
          <PhotoThumb
            key={photo._id}
            photo={photo}
            onSelect={onToggleSelect ? () => onToggleSelect(photo._id) : () => onSelectPhoto(photo._id)}
            activeJob={toolJobs?.find((j) => j.sourceUrl === photo.url)}
            selected={selectedPhotoIds?.has(photo._id) ?? false}
            selectionMode={!!onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoThumb({
  photo,
  onSelect,
  activeJob,
  selected,
  selectionMode,
}: {
  photo: Photo;
  onSelect: () => void;
  activeJob?: ToolJob;
  selected: boolean;
  selectionMode: boolean;
}) {
  const score = photo.analysis?.qualityScore ?? null;
  const isPending = photo.status === 'pending';
  const isFailed  = photo.status === 'failed';
  const isReady   = photo.status === 'analyzed' && photo.enhancementGate === 'approved';
  const isGenerated = photo.url.includes('/generated/');

  const needsAttention =
    photo.status === 'analyzed' &&
    (!photo.analysis?.roomType || photo.analysis?.emptyRoom || photo.analysis?.suitable === false);

  const hasJobProcessing = activeJob && ['queued', 'processing'].includes(activeJob.status);
  const hasJobReady = activeJob?.status === 'ready_for_review';

  return (
    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 112 }}>
      <button
        type="button"
        onClick={onSelect}
        style={{ width: 112, height: 80 }}
        className={`relative overflow-hidden rounded-xl border bg-paper group focus:outline-none focus:ring-2 focus:ring-analysis/40 transition-all hover:shadow-sm
          ${selected
            ? 'border-analysis ring-2 ring-analysis/30 shadow-sm'
            : 'border-hairline hover:border-analysis/40'}`}
      >
        <Image
          src={resolvePhotoUrl(photo.url)}
          alt={photo.originalName}
          fill
          unoptimized
          className={`object-cover transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
        />

        {/* Analyzing / job spinner */}
        {(isPending || hasJobProcessing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}

        {/* Hover overlay */}
        {!isPending && !hasJobProcessing && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        )}

        {/* Selection checkbox */}
        {selectionMode && (
          <div className={`absolute top-1 left-1 h-5 w-5 rounded flex items-center justify-center border-2 transition-all
            ${selected ? 'bg-analysis border-analysis' : 'bg-black/40 border-white/70'}`}>
            {selected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )}

        {/* Job / AI badges — top right */}
        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
          {hasJobReady && (
            <span className="rounded-full bg-approved px-1.5 py-0.5 text-[8px] font-bold text-white shadow">Review</span>
          )}
          {isGenerated && !hasJobReady && (
            <span className="rounded-full bg-analysis px-1.5 py-0.5 text-[8px] font-bold text-white shadow">AI</span>
          )}
        </div>

        {/* Bottom bar — quality score + flags */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-1.5 py-0.5 bg-gradient-to-t from-black/60 to-transparent">
          {score !== null ? (
            <span className={`text-[9px] font-bold drop-shadow ${qualityColor(score)}`}>{score}/10</span>
          ) : <span />}
          <div className="flex gap-0.5">
            {photo.isCover && <span className="text-[9px] text-yellow-300">★</span>}
            {isReady && !isGenerated && <span className="rounded bg-approved/80 px-1 text-[8px] text-white font-medium">ok</span>}
            {isFailed && <span className="rounded bg-skip/80 px-1 text-[8px] text-white font-medium">!</span>}
          </div>
        </div>
      </button>

      {/* "Needs attention" label below the thumbnail */}
      {needsAttention && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gate animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-gate" />
          Needs attention
        </span>
      )}
    </div>
  );
}
