'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Wand2, Pencil, Check, X, RefreshCw } from 'lucide-react';
import type { Photo, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';
import { BeforeAfterSlider } from './BeforeAfterSlider';

const ROOM_TYPES = [
  'Living Room', 'Bedroom', 'Kitchen', 'Bathroom',
  'Dining Room', 'Balcony', 'Hallway', 'Garage', 'Exterior', 'Other',
];

// Maps any user-typed label to one of the predefined ROOM_TYPES so the gallery
// never creates new columns for synonyms like "Guest Bedroom" or "Home Office room".
function normalizeRoomType(input: string): string {
  const s = input.toLowerCase().trim();
  if (ROOM_TYPES.map(r => r.toLowerCase()).includes(s)) {
    return ROOM_TYPES.find(r => r.toLowerCase() === s)!;
  }
  if (/bed\s*room|bed/.test(s) && !/bathroom/.test(s))  return 'Bedroom';
  if (/bath\s*room|toilet|shower|wc/.test(s))            return 'Bathroom';
  if (/kitchen|cook|pantry/.test(s))                     return 'Kitchen';
  if (/living|lounge|sitting|family\s*room|reception/.test(s)) return 'Living Room';
  if (/dining|dinner/.test(s))                           return 'Dining Room';
  if (/balcony|patio|terrace|veranda/.test(s))           return 'Balcony';
  if (/hall(way)?|corridor|entrance|foyer|lobby/.test(s)) return 'Hallway';
  if (/garage|parking|carport/.test(s))                  return 'Garage';
  if (/exterior|garden|yard|outside|outdoor|front\s*door|backyard/.test(s)) return 'Exterior';
  return 'Other';
}

const COLOR_PALETTE = [
  { label: 'White',       hex: '#F8F8F6' },
  { label: 'Cream',       hex: '#FAF0E6' },
  { label: 'Beige',       hex: '#D4B896' },
  { label: 'Warm Gray',   hex: '#9E9A90' },
  { label: 'Charcoal',    hex: '#4A4A4A' },
  { label: 'Navy',        hex: '#1B2A4A' },
  { label: 'Sage',        hex: '#8B9E73' },
  { label: 'Forest',      hex: '#2D5016' },
  { label: 'Terra Cotta', hex: '#C4622D' },
  { label: 'Dusty Rose',  hex: '#C9A9A6' },
  { label: 'Gold',        hex: '#C9A84C' },
  { label: 'Teal',        hex: '#0E7C7B' },
];

interface PhotoSpotlightProps {
  photos: Photo[];
  onSelectPhoto: (photoId: string) => void;
  onLabelRoom: (photoId: string, roomType: string) => Promise<void>;
  onApplySuggestion: (photoId: string, prompt: string) => Promise<void>;
  toolJobs?: ToolJob[];
  onAcceptJob?: (jobId: string) => Promise<void>;
  onRejectJobAndRegenerate?: (jobId: string, photoId: string, reason: string) => Promise<void>;
}

export function PhotoSpotlight({
  photos,
  onSelectPhoto,
  onLabelRoom,
  onApplySuggestion,
  toolJobs,
  onAcceptJob,
  onRejectJobAndRegenerate,
}: PhotoSpotlightProps) {
  const [index, setIndex]                 = useState(0);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customRoom, setCustomRoom]       = useState('');
  const [labelingBusy, setLabelingBusy]   = useState(false);
  const [applyBusy, setApplyBusy]         = useState(false);
  const [jobBusy, setJobBusy]             = useState(false);

  // Reject flow
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason]       = useState('');

  // Edit prompt popup
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPrompt, setEditPrompt]       = useState('');

  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const touchStartY   = useRef<number>(0);
  const [planVisible,  setPlanVisible]  = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);

  const clampedIndex = Math.min(index, photos.length - 1);
  const photo = photos[clampedIndex];

  // Derive activeJob + jobHasPlan early (before hooks that reference them)
  const _photoJobs = (toolJobs ?? []).filter(
    (j) => j.sourceUrl === photo?.url && !['accepted', 'rejected'].includes(j.status)
  );
  const _activeJob =
    _photoJobs.find((j) => j.status === 'ready_for_review' && j.resultType === 'image') ??
    _photoJobs.find((j) => j.status === 'ready_for_review') ??
    _photoJobs.find((j) => ['queued', 'processing'].includes(j.status));
  const _jobHasPlan =
    _activeJob?.status === 'ready_for_review' && _activeJob?.resultType !== 'image' && !!_activeJob?.resultData;

  // Reset per-photo state when photo changes
  useEffect(() => {
    setSelectedColors([]);
    setCustomRoom('');
    setShowRejectInput(false);
    setRejectReason('');
  }, [clampedIndex]);

  // Slide-up animation + reset expanded state when plan arrives or changes
  useEffect(() => {
    if (_jobHasPlan) {
      setPlanExpanded(false);
      const id = requestAnimationFrame(() => setPlanVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setPlanVisible(false);
      setPlanExpanded(false);
    }
  }, [_jobHasPlan]);

  // Focus textarea when edit modal opens
  useEffect(() => {
    if (showEditModal) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [showEditModal]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(photos.length - 1, i + 1)), [photos.length]);

  if (!photo || photos.length === 0) return null;

  // ── Derived states ──
  const isPending   = photo.status === 'pending';
  const isAnalyzed  = photo.status === 'analyzed';
  const needsAttention =
    isAnalyzed &&
    (!photo.analysis?.roomType || photo.analysis?.emptyRoom || photo.analysis?.suitable === false);
  const hasRoomType = isAnalyzed && !!photo.analysis?.roomType;

  // Reuse the pre-hook derivations (needed above for useEffect)
  const activeJob  = _activeJob;
  const jobHasPlan = _jobHasPlan;
  const jobRunning  = activeJob && ['queued', 'processing'].includes(activeJob.status);
  const jobHasImage = activeJob?.status === 'ready_for_review' && activeJob?.resultType === 'image' && !!activeJob?.resultUrl;

  // ── Helpers ──
  function toggleColor(hex: string) {
    setSelectedColors((prev) => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 2)   return [prev[1], hex];
      return [...prev, hex];
    });
  }

  function buildSuggestionPrompt(extra?: string): string {
    const parts: string[] = [];
    if (photo.analysis?.roomType) parts.push(`Room: ${photo.analysis.roomType}`);
    if (selectedColors.length > 0) {
      const labels = selectedColors.map((h) => COLOR_PALETTE.find((c) => c.hex === h)?.label ?? h);
      parts.push(`Preferred colors: ${labels.join(', ')}`);
    }
    if (extra) parts.push(extra);
    return parts.join('. ');
  }

  async function handleLabelRoom(rawInput: string) {
    const normalized = normalizeRoomType(rawInput);
    setLabelingBusy(true);
    try {
      await onLabelRoom(photo._id, normalized);
      // Stay on the same photo — do not auto-advance
    } finally {
      setLabelingBusy(false);
      setCustomRoom('');
    }
  }

  async function handleApply() {
    setApplyBusy(true);
    try {
      await onApplySuggestion(photo._id, buildSuggestionPrompt());
    } finally {
      setApplyBusy(false);
    }
  }

  async function handleAcceptJob() {
    if (!activeJob || !onAcceptJob) return;
    setJobBusy(true);
    try {
      await onAcceptJob(activeJob._id);
    } finally {
      setJobBusy(false);
    }
  }

  async function handleRejectWithReason() {
    if (!activeJob || !onRejectJobAndRegenerate || !rejectReason.trim()) return;
    setJobBusy(true);
    try {
      await onRejectJobAndRegenerate(activeJob._id, photo._id, buildSuggestionPrompt(rejectReason.trim()));
      setShowRejectInput(false);
      setRejectReason('');
    } finally {
      setJobBusy(false);
    }
  }

  async function handleEditSubmit() {
    if (!editPrompt.trim()) return;
    setApplyBusy(true);
    setShowEditModal(false);
    try {
      await onApplySuggestion(photo._id, editPrompt.trim());
      setEditPrompt('');
    } finally {
      setApplyBusy(false);
    }
  }

  function asStr(v: unknown) { return v != null ? String(v) : ''; }

  // ── Render ──
  return (
    <div className="flex flex-col gap-3">

      {/* ════════════════════════════════════════
          Main spotlight / image area
          ════════════════════════════════════════ */}
      <div
        className="relative rounded-2xl overflow-hidden bg-black"
        style={{ aspectRatio: '16/9' }}
        onWheel={(e) => {
          if (!jobHasPlan || showRejectInput) return;
          if (e.deltaY < 0 && !planExpanded) { e.preventDefault(); setPlanExpanded(true); }
        }}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (!jobHasPlan || showRejectInput) return;
          const dy = touchStartY.current - e.changedTouches[0].clientY;
          if (dy > 30 && !planExpanded) setPlanExpanded(true);
          if (dy < -30 && planExpanded && (scrollRef.current?.scrollTop ?? 0) === 0) setPlanExpanded(false);
        }}
      >

        {/* Image or BeforeAfterSlider */}
        {jobHasImage && activeJob?.sourceUrl && activeJob?.resultUrl ? (
          <BeforeAfterSlider
            beforeUrl={resolvePhotoUrl(activeJob.sourceUrl)}
            afterUrl={resolvePhotoUrl(activeJob.resultUrl)}
            beforeLabel="Original"
            afterLabel="AI staged"
            className="absolute inset-0 cursor-col-resize select-none"
          />
        ) : (
          <Image
            src={resolvePhotoUrl(photo.url)}
            alt={photo.originalName}
            fill
            unoptimized
            className={`object-cover transition-opacity ${isPending || jobRunning ? 'opacity-60' : 'opacity-100'}`}
            priority
          />
        )}

        {/* ── Analyzing spinner ── */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="h-8 w-8 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
              <span className="text-xs text-white font-semibold">Analyzing…</span>
            </div>
          </div>
        )}

        {/* ── Job running overlay ── */}
        {jobRunning && !isPending && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-analysis/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm animate-pulse">
              <span className="h-2 w-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {activeJob?.status === 'queued' ? 'AI queued…' : 'AI generating…'}
            </span>
          </div>
        )}

        {/* ── Needs attention badge ── */}
        {needsAttention && !isPending && !jobRunning && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gate px-3 py-1.5 text-xs font-bold text-white shadow-lg animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Needs attention
            </span>
          </div>
        )}

        {/* ── Room type tag (normal state) ── */}
        {hasRoomType && !needsAttention && !jobRunning && !jobHasPlan && !jobHasImage && (
          <div className="absolute top-4 left-4 z-10">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              {photo.analysis.roomType}
            </span>
          </div>
        )}

        {/* ── Photo counter ── */}
        <div className="absolute top-4 right-4 z-10">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {clampedIndex + 1} / {photos.length}
          </span>
        </div>

        {/* ════════ BOTTOM OVERLAYS (mutually exclusive) ════════ */}

        {/* 1 · Room type input — for empty/unclassified rooms */}
        {needsAttention && !isPending && !jobRunning && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-5 pt-12 pb-5">
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-2">
              What room is this?
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ROOM_TYPES.map((room) => (
                <button
                  key={room}
                  disabled={labelingBusy}
                  onClick={() => void handleLabelRoom(room)}
                  className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 backdrop-blur-sm transition-all disabled:opacity-40"
                >
                  {room}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customRoom.trim()) void handleLabelRoom(customRoom.trim());
                }}
                placeholder="Or type a room name…"
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 backdrop-blur-sm focus:outline-none focus:border-white/50"
              />
              {customRoom.trim() && (
                <button
                  onClick={() => void handleLabelRoom(customRoom.trim())}
                  disabled={labelingBusy}
                  className="rounded-xl bg-analysis px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {labelingBusy ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> : 'Set'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2 · Furniture plan — collapsed peek (initial) → scroll-to-expand sheet */}
        {jobHasPlan && !showRejectInput && !needsAttention && activeJob?.resultData && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col"
            style={{
              transform: planVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* ── EXPANDED: gradient + scrollable details (only when planExpanded) ── */}
            <div
              style={{
                maxHeight: planExpanded ? '52%' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Gradient fade from image into panel */}
              <div className="h-12 shrink-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.82))' }} />

              {/* Scrollable content */}
              <div
                ref={scrollRef}
                className="overflow-y-auto px-5 pt-2 pb-2"
                style={{
                  maxHeight: 'calc(52cqh - 48px)',
                  background: 'rgba(0,0,0,0.90)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.18) transparent',
                }}
                onWheel={(e) => {
                  if ((scrollRef.current?.scrollTop ?? 0) === 0 && e.deltaY < 0) {
                    e.stopPropagation();
                    setPlanExpanded(false);
                  }
                }}
              >
                {/* Color palette */}
                {Array.isArray(activeJob.resultData.colorPalette) && (activeJob.resultData.colorPalette as string[]).length > 0 && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest shrink-0">Colors</span>
                    {(activeJob.resultData.colorPalette as string[]).map((c, i) => (
                      <span key={i} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/80 font-medium">{c}</span>
                    ))}
                    {!!activeJob.resultData.lightingMood && (
                      <span className="text-[10px] text-white/40 italic">{asStr(activeJob.resultData.lightingMood)}</span>
                    )}
                  </div>
                )}

                {/* Dimensions */}
                {activeJob.resultData.estimatedDimensions != null && (() => {
                  const d = activeJob.resultData.estimatedDimensions as Record<string, unknown>;
                  return d.widthMeters || d.lengthMeters ? (
                    <p className="text-[10px] text-white/35 mb-3">
                      Estimated size: {asStr(d.widthMeters)}m × {asStr(d.lengthMeters)}m
                      {d.basis ? <span className="ml-1 italic">({asStr(d.basis)})</span> : null}
                    </p>
                  ) : null;
                })()}

                {/* Furniture pieces */}
                {Array.isArray(activeJob.resultData.pieces) && (activeJob.resultData.pieces as Record<string, unknown>[]).length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                      Furniture · {(activeJob.resultData.pieces as unknown[]).length} pieces
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {(activeJob.resultData.pieces as Record<string, unknown>[]).map((piece, i) => (
                        <div key={i} className="rounded-xl border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <p className="text-xs font-semibold text-white leading-tight">{asStr(piece.item)}</p>
                          {!!piece.placement && <p className="text-[10px] text-white/50 mt-0.5">{asStr(piece.placement)}</p>}
                          {!!piece.reason && <p className="text-[10px] text-white/35 mt-0.5 italic">{asStr(piece.reason)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lighting */}
                {Array.isArray(activeJob.resultData.lighting) && (activeJob.resultData.lighting as Record<string, unknown>[]).length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Lighting</p>
                    <div className="flex flex-col gap-1.5">
                      {(activeJob.resultData.lighting as Record<string, unknown>[]).map((l, i) => (
                        <div key={i} className="rounded-xl border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <p className="text-xs font-semibold text-white leading-tight">{asStr(l.item)}</p>
                          {!!l.placement && <p className="text-[10px] text-white/50 mt-0.5">{asStr(l.placement)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Window treatments */}
                {activeJob.resultData.windowTreatments != null && (() => {
                  const wt = activeJob.resultData.windowTreatments as Record<string, unknown>;
                  return wt.type ? (
                    <div className="mb-3">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Window Treatments</p>
                      <div className="rounded-xl border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-semibold text-white">
                          {asStr(wt.type)}{wt.color ? <span className="font-normal text-white/60"> · {asStr(wt.color)}</span> : null}
                        </p>
                        {!!wt.notes && <p className="text-[10px] text-white/45 mt-0.5">{asStr(wt.notes)}</p>}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Bedding */}
                {activeJob.resultData.bedding != null && (() => {
                  const bd = activeJob.resultData.bedding as Record<string, unknown>;
                  return bd.bedSize ? (
                    <div className="mb-2">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Bedding</p>
                      <div className="rounded-xl border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-semibold text-white">{asStr(bd.bedSize)} bed · {asStr(bd.sheetColor)}</p>
                        {!!bd.duvet && <p className="text-[10px] text-white/50 mt-0.5">{asStr(bd.duvet)}</p>}
                        {!!bd.pillowArrangement && <p className="text-[10px] text-white/40 mt-0.5">{asStr(bd.pillowArrangement)}</p>}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* ── Always-visible footer: drag handle + room info + buttons ── */}
            <div className="shrink-0 px-5 pb-5" style={{ background: 'rgba(0,0,0,0.96)' }}>
              {/* Drag handle — click or scroll gesture triggers expand/collapse */}
              <button
                className="w-full flex flex-col items-center pt-2.5 pb-2 group"
                onClick={() => setPlanExpanded((v) => !v)}
                aria-label={planExpanded ? 'Collapse details' : 'Expand details'}
              >
                <div className="w-9 h-1 rounded-full bg-white/25 group-hover:bg-white/50 transition-colors mb-1" />
                {!planExpanded && (
                  <span className="text-[9px] text-white/35 flex items-center gap-1">
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                      <path d="M1 4L4 1L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Scroll for full plan
                  </span>
                )}
              </button>

              {/* Room info + action buttons */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Furniture plan ready</p>
                  <p className="text-sm font-bold text-white leading-tight">
                    {asStr(activeJob.resultData.roomType || photo.analysis?.roomType)}
                    {activeJob.resultData.style
                      ? <span className="font-normal text-white/65"> · {asStr(activeJob.resultData.style)}</span>
                      : null}
                  </p>
                  {!!activeJob.resultData.summary && (
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed line-clamp-2">
                      {asStr(activeJob.resultData.summary)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 mt-0.5">
                  <button
                    disabled={jobBusy}
                    onClick={() => setShowRejectInput(true)}
                    className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={jobBusy}
                    onClick={() => void handleAcceptJob()}
                    className="flex items-center gap-1.5 rounded-xl bg-approved px-4 py-2 text-xs font-semibold text-white hover:bg-approved/85 transition-all disabled:opacity-50"
                  >
                    {jobBusy
                      ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      : <><Check className="h-3.5 w-3.5" /> Accept</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3 · Reject reason input */}
        {jobHasPlan && showRejectInput && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/97 via-black/85 to-transparent px-5 pt-14 pb-4">
            <p className="text-xs font-semibold text-white mb-1.5">What would you like to change?</p>
            <p className="text-[10px] text-white/50 mb-2">Describe the changes and we'll regenerate the suggestion.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Use warmer tones, add a reading nook, prefer minimalist Scandinavian style…"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/35 backdrop-blur-sm focus:outline-none focus:border-white/50 resize-none h-16"
            />
            <div className="flex items-center gap-3 mt-2.5">
              <button
                onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                className="text-xs text-white/55 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || jobBusy}
                onClick={() => void handleRejectWithReason()}
                className="flex items-center gap-1.5 rounded-xl bg-analysis px-4 py-2 text-xs font-semibold text-white hover:bg-analysis/85 disabled:opacity-40 transition-all"
              >
                {jobBusy
                  ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <><RefreshCw className="h-3 w-3" /> Regenerate</>}
              </button>
            </div>
          </div>
        )}

        {/* 4 · Image job accept/reject (on top of the BeforeAfterSlider) */}
        {jobHasImage && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {!showRejectInput ? (
              <>
                <button
                  disabled={jobBusy}
                  onClick={() => setShowRejectInput(true)}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-5 py-2.5 text-xs font-bold text-white hover:bg-black/80 backdrop-blur-sm transition-all disabled:opacity-40 shadow-lg"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  disabled={jobBusy}
                  onClick={() => void handleAcceptJob()}
                  className="flex items-center gap-1.5 rounded-full bg-approved px-5 py-2.5 text-xs font-bold text-white hover:bg-approved/85 transition-all disabled:opacity-50 shadow-lg"
                >
                  {jobBusy
                    ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <><Check className="h-3.5 w-3.5" /> Accept</>}
                </button>
              </>
            ) : (
              <div className="rounded-2xl bg-black/80 backdrop-blur-sm border border-white/20 p-4 w-72 shadow-xl">
                <p className="text-xs font-semibold text-white mb-1.5">What to change?</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Different wall color, remove the rug…"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 resize-none h-14"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                    className="flex-1 rounded-xl border border-white/20 py-1.5 text-xs font-medium text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rejectReason.trim() || jobBusy}
                    onClick={() => void handleRejectWithReason()}
                    className="flex-1 rounded-xl bg-analysis py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {jobBusy ? '…' : 'Regenerate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5 · Get AI suggestion button — on image, no active job, has room type */}
        {hasRoomType && !needsAttention && !jobRunning && !jobHasPlan && !jobHasImage && !isPending && (
          <div className="absolute bottom-4 inset-x-4 z-10 flex items-center justify-between">
            <button
              onClick={() => void handleApply()}
              disabled={applyBusy}
              className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-analysis backdrop-blur-sm transition-all disabled:opacity-50 shadow-lg"
            >
              {applyBusy
                ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><Wand2 className="h-3.5 w-3.5" /> Get AI suggestion</>}
            </button>
            <button
              onClick={() => { setEditPrompt(''); setShowEditModal(true); }}
              className="flex items-center gap-1.5 rounded-full bg-black/60 border border-white/25 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all shadow-lg"
              title="Custom prompt"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        )}

        {/* Also show Edit button when job plan is shown */}
        {jobHasPlan && !showRejectInput && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => { setEditPrompt(''); setShowEditModal(true); }}
              className="flex items-center gap-1 rounded-full bg-black/60 border border-white/20 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
        )}

        {/* ── Prev / Next navigation ── */}
        {clampedIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {clampedIndex < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Click to open full carousel (only in normal state) */}
        {!needsAttention && !isPending && !jobHasPlan && !jobHasImage && !jobRunning && !applyBusy && (
          <button
            onClick={() => onSelectPhoto(photo._id)}
            className="absolute inset-0 cursor-zoom-in z-0"
            aria-label="View full screen"
          />
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p, i) => {
          const thumbNeedsAttention =
            p.status === 'analyzed' &&
            (!p.analysis?.roomType || p.analysis?.emptyRoom || p.analysis?.suitable === false);
          const thumbJob = toolJobs?.find((j) => j.sourceUrl === p.url);
          const thumbJobReady = thumbJob?.status === 'ready_for_review';
          return (
            <button
              key={p._id}
              onClick={() => setIndex(i)}
              style={{
                width: 72,
                height: 52,
                borderColor: i === clampedIndex ? 'var(--color-analysis, #0E7C7B)' : 'transparent',
                opacity: i === clampedIndex ? 1 : 0.55,
              }}
              className="relative shrink-0 rounded-lg overflow-hidden border-2 transition-all hover:opacity-80"
            >
              <Image src={resolvePhotoUrl(p.url)} alt="" fill unoptimized className="object-cover" />
              {p.status === 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
              {thumbJobReady && (
                <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-approved" />
              )}
              {thumbNeedsAttention && !thumbJobReady && (
                <div className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-gate animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Color palette — only when no active job, has room type ── */}
      {hasRoomType && !needsAttention && !jobHasPlan && !jobHasImage && (
        <div>
          <p className="text-xs font-semibold text-ink/50 mb-2">
            Color palette preference
            <span className="ml-1 text-ink/30 font-normal">(pick up to 2)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => {
              const selected = selectedColors.includes(c.hex);
              return (
                <button
                  key={c.hex}
                  onClick={() => toggleColor(c.hex)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all
                    ${selected
                      ? 'border-analysis bg-analysis-soft text-analysis shadow-sm'
                      : 'border-hairline text-ink/60 hover:border-analysis/40'}`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.label}
                  {selected && <span className="text-[9px] font-bold text-analysis">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Edit / custom prompt modal
          ════════════════════════════════════════ */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold">Custom AI prompt</h3>
                  <p className="text-xs text-ink/45 mt-0.5">
                    Describe exactly what you'd like — furniture, style, colors, mood.
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-ink/35 hover:bg-paper hover:text-ink transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Room + color context */}
              {(hasRoomType || selectedColors.length > 0) && (
                <div className="mt-3 rounded-xl bg-analysis-soft px-3 py-2 text-[11px] text-analysis">
                  {hasRoomType && <span className="font-semibold">{photo.analysis.roomType}</span>}
                  {selectedColors.length > 0 && (
                    <span className="ml-1 text-analysis/70">
                      · {selectedColors.map((h) => COLOR_PALETTE.find((c) => c.hex === h)?.label).join(' + ')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4">
              <textarea
                ref={textareaRef}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g. Add a modern sectional sofa in cream, warm pendant lighting, keep the wooden floor visible, Scandinavian style…"
                className="w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-analysis/60 focus:ring-2 focus:ring-analysis/15 transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-paper transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!editPrompt.trim() || applyBusy}
                  onClick={() => void handleEditSubmit()}
                  className="flex-1 rounded-xl bg-analysis px-4 py-2.5 text-sm font-semibold text-white hover:bg-analysis/90 disabled:opacity-50 transition-all"
                >
                  {applyBusy
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Generating…
                      </span>
                    : <><Wand2 className="h-4 w-4 inline mr-1" /> Generate</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
