'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ListingSummary } from '@/lib/types';
import { Header } from '@/components/Header';
import { NewListingForm } from '@/components/NewListingForm';
import { ListingCard } from '@/components/ListingCard';
import { WorkspaceStatus } from '@/components/WorkspaceStatus';
import type { WorkspaceActivity } from '@/lib/types';

/* ─── Delete confirmation modal ─── */
function DeleteModal({
  listing,
  onConfirm,
  onCancel,
}: {
  listing: ListingSummary;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-0">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-skip-soft">
              <Trash2 className="h-4 w-4 text-skip" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Delete listing?</h2>
              <p className="text-sm text-ink/50 mt-0.5 leading-snug">
                This will permanently delete{' '}
                <span className="font-semibold text-ink">"{listing.title}"</span>{' '}
                and all its photos. This cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className="ml-2 h-7 w-7 flex shrink-0 items-center justify-center rounded-full text-ink/35 hover:bg-paper hover:text-ink transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 px-6 py-5">
          <button
            type="button"
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-paper transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-xl bg-skip px-4 py-2.5 text-sm font-semibold text-white hover:bg-skip/85 disabled:opacity-50 transition-all shadow-sm"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Deleting…
              </span>
            ) : (
              'Delete listing'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-analysis-soft">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="11" height="11" rx="2" fill="#0E7C7B" fillOpacity="0.8" />
          <rect x="15" y="2" width="11" height="11" rx="2" fill="#0E7C7B" fillOpacity="0.35" />
          <rect x="2" y="15" width="11" height="11" rx="2" fill="#0E7C7B" fillOpacity="0.35" />
          <rect x="15" y="15" width="11" height="11" rx="2" fill="#0E7C7B" fillOpacity="0.8" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-bold mb-2 text-balance">No listings yet</h2>
      <p className="text-sm text-ink/45 max-w-xs text-balance leading-relaxed mb-7">
        Create your first listing to start uploading property photos and running Zenrth&apos;s photo pipeline.
      </p>
      <NewListingForm onCreate={async (title, address, requiredRoomTypes) => {
        await api.createListing(title, address, requiredRoomTypes);
        onNew();
      }} />
    </div>
  );
}

/* ─── Dashboard page ─── */
export default function DashboardPage() {
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingSummary | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ls, act] = await Promise.all([
        api.listListings(),
        api.workspaceActivity().catch(() => null),
      ]);
      setListings(ls);
      setActivity(act);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(title: string, address: string, requiredRoomTypes: string[]) {
    const listing = await api.createListing(title, address, requiredRoomTypes);
    window.location.href = `/listings/${listing._id}`;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deleteListing(deleteTarget._id);
    setDeleteTarget(null);
    setListings((prev) => prev.filter((l) => l._id !== deleteTarget._id));
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-10">

        {/* Workspace status bar */}
        {activity && <WorkspaceStatus activity={activity} />}

        {/* Page header row */}
        {!loading && !error && listings.length > 0 && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight">Listings</h1>
              <p className="text-sm text-ink/45 mt-0.5">
                {listings.length} {listings.length === 1 ? 'property' : 'properties'}
              </p>
            </div>
            <NewListingForm onCreate={handleCreate} />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-hairline bg-surface overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-hairline/50" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="h-4 bg-hairline rounded-full w-3/4" />
                  <div className="h-3 bg-hairline rounded-full w-1/2" />
                  <div className="h-2 bg-hairline rounded-full w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-xl border border-gate/30 bg-gate-soft p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gate/15">
              <AlertTriangle className="h-5 w-5 text-gate" />
            </div>
            <div>
              <p className="font-semibold text-ink mb-1">Could not load listings</p>
              <p className="text-sm text-ink/55">{error}</p>
            </div>
            <button
              onClick={() => { setLoading(true); load(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-paper transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && listings.length === 0 && (
          <EmptyState onNew={load} />
        )}

        {/* Listing grid */}
        {!loading && !error && listings.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div key={listing._id} className="group/card relative">
                <ListingCard listing={listing} />
                {/* Delete button overlay */}
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteTarget(listing); }}
                  className="absolute top-3 left-3 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover/card:opacity-100 hover:bg-skip/80 transition-all backdrop-blur-sm"
                  aria-label={`Delete ${listing.title}`}
                  title="Delete listing"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          listing={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
