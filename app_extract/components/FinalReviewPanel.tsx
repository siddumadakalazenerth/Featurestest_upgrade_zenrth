'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Download, Loader2, Rocket } from 'lucide-react';
import type { Listing, PublicationChecklist } from '@/lib/types';

interface FinalReviewPanelProps {
  listing: Listing;
  publication: PublicationChecklist;
  onSaveCopy: (copy: Listing['listingCopy']) => Promise<void>;
  onPublish: () => Promise<void>;
  onExport: () => Promise<void>;
}

export function FinalReviewPanel({
  listing,
  publication,
  onSaveCopy,
  onPublish,
  onExport,
}: FinalReviewPanelProps) {
  const [copy, setCopy] = useState(listing.listingCopy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setCopy(listing.listingCopy), [listing.listingCopy]);

  async function save(approved: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      await onSaveCopy({ ...copy, approved });
      setMessage(approved ? 'Listing copy approved.' : 'Draft saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the listing copy.');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMessage(null);
    try {
      await onPublish();
      setMessage('Property published successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish the property.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      await onExport();
    } finally {
      setBusy(false);
    }
  }

  const isPublished = listing.publication.status === 'published';
  const statusBadge = isPublished
    ? { label: 'Published', className: 'bg-approved-soft text-approved' }
    : publication.canPublish
      ? { label: 'Ready to publish', className: 'bg-analysis-soft text-analysis' }
      : { label: 'Final checks in progress', className: 'bg-gate-soft text-gate' };

  return (
    <section className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-base font-bold">Final review</h2>
          <p className="mt-1 text-xs text-ink/50">
            Zenrth handles the checks automatically. Review the final words before publishing.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Vertical stepper checklist */}
        <div className="relative flex flex-col gap-1">
          {publication.checks.map((check, i) => {
            const done = check.complete || Boolean(check.optional);
            const isLast = i === publication.checks.length - 1;
            return (
              <div key={check.key} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && (
                  <span
                    className={`absolute left-[9px] top-5 h-full w-px ${done ? 'bg-approved/40' : 'bg-hairline'}`}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-approved" />
                  ) : (
                    <Circle className="h-[18px] w-[18px] text-hairline" strokeWidth={2.5} />
                  )}
                </span>
                <div className="pt-px">
                  <p className={`text-xs font-medium leading-snug ${done ? 'text-ink/70' : 'text-ink/45'}`}>
                    {check.label}
                    {check.optional && !check.complete ? ' (optional)' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Copy editor */}
        <div className="space-y-3">
          <input
            value={copy.headline || ''}
            onChange={(event) => setCopy((current) => ({ ...current, headline: event.target.value }))}
            placeholder="Listing headline"
            className="w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm font-medium focus:outline-none focus:border-analysis/50 focus:ring-2 focus:ring-analysis/15 transition-all"
          />
          <textarea
            value={copy.description || ''}
            onChange={(event) => setCopy((current) => ({ ...current, description: event.target.value }))}
            placeholder="Generate listing preparation from the recommended actions first."
            rows={7}
            className="w-full resize-y rounded-xl border border-hairline bg-paper px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-analysis/50 focus:ring-2 focus:ring-analysis/15 transition-all"
          />
          {copy.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {copy.highlights.map((highlight) => (
                <span key={highlight} className="rounded-full bg-analysis-soft px-2.5 py-1 text-[11px] font-medium text-analysis">
                  {highlight}
                </span>
              ))}
            </div>
          )}
          {copy.factsToConfirm?.length > 0 && (
            <div className="rounded-xl bg-gate-soft px-3 py-2.5 text-xs text-gate">
              Confirm before publishing: {copy.factsToConfirm.join(' · ')}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy || !copy.headline || !copy.description}
              onClick={() => void save(true)}
              className="rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink/85 disabled:opacity-40 transition-all"
            >
              Approve copy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(false)}
              className="rounded-xl border border-hairline px-4 py-2.5 text-xs font-semibold hover:bg-paper disabled:opacity-40 transition-all"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-xl border border-hairline px-4 py-2.5 text-xs font-semibold hover:bg-paper disabled:opacity-40 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Export package
            </button>
          </div>

          {/* Full-width publish CTA — only prominent once actually ready */}
          <button
            type="button"
            disabled={busy || !publication.canPublish || isPublished}
            onClick={() => void publish()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-approved px-4 py-3 text-sm font-semibold text-white hover:bg-approved/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {isPublished ? 'Published' : 'Publish property'}
          </button>

          {message && <p className="text-xs text-ink/55">{message}</p>}
        </div>
      </div>
    </section>
  );
}
