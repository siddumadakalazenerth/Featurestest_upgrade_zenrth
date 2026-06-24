'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  Upload,
  Wand2,
  Eye,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Sparkles,
  Sofa,
  Scissors,
  Shield,
  Map,
} from 'lucide-react';
import type { GuidanceAction, GuidanceTool, PropertyGuidance, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

const READINESS_CONFIG: Record<PropertyGuidance['readiness'], { label: string; color: string }> = {
  incomplete:      { label: 'Incomplete',      color: 'text-ink/45' },
  needs_attention: { label: 'Needs attention', color: 'text-gate' },
  nearly_ready:    { label: 'Nearly ready',    color: 'text-analysis' },
  ready:           { label: 'Ready',           color: 'text-approved' },
};

// Matches GuidanceTool exactly as defined in lib/types.ts — do not add tools
// here that don't exist on the backend (PropertyAssessment.actions.tool enum
// in src/models/PropertyAssessment.js is the source of truth).
const TOOL_ICON: Record<GuidanceTool, ReactNode> = {
  photo_enhancement:    <Wand2 className="h-4 w-4" />,
  defurnishing:         <Sofa className="h-4 w-4" />,
  smart_editing:        <Scissors className="h-4 w-4" />,
  multi_image_analysis: <Eye className="h-4 w-4" />,
  floor_plan_recognition: <Map className="h-4 w-4" />,
  virtual_staging:      <Sparkles className="h-4 w-4" />,
  listing_copy:         <Eye className="h-4 w-4" />,
  content_moderation:   <Shield className="h-4 w-4" />,
  none:                 <CheckCircle2 className="h-4 w-4" />,
};

function actionKindIcon(kind: GuidanceAction['kind']): ReactNode {
  switch (kind) {
    case 'upload':
    case 'reupload':
      return <Upload className="h-4 w-4" />;
    case 'review':
      return <Eye className="h-4 w-4" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return null;
  }
}

interface ActionCardProps {
  action: GuidanceAction;
  photoThumb?: string | null;
  onExecute: (actionId: string, prompt?: string) => Promise<void>;
  onUploadTrigger?: (roomType: string | null, photoId: string | null) => void;
  disabled?: boolean;
}

function ActionCard({ action, photoThumb, onExecute, onUploadTrigger, disabled }: ActionCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUpload = action.kind === 'upload' || action.kind === 'reupload';
  const icon = action.tool !== 'none' ? TOOL_ICON[action.tool] : actionKindIcon(action.kind);

  async function handleExecute() {
    if (isUpload) {
      onUploadTrigger?.(action.roomType, action.photoId);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onExecute(action.actionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const priorityColor =
    action.priority >= 90 ? 'border-l-skip' :
    action.priority >= 60 ? 'border-l-gate' :
    'border-l-hairline';

  return (
    <div className={`rounded-xl border border-hairline bg-surface overflow-hidden border-l-4 ${priorityColor}`}>
      <div className="flex items-start gap-3 p-4">
        {/* Photo thumb */}
        {photoThumb ? (
          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-hairline">
            <Image src={resolvePhotoUrl(photoThumb)} alt="" fill unoptimized className="object-cover" />
          </div>
        ) : (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
            ${action.priority >= 90 ? 'bg-skip-soft text-skip' :
              action.priority >= 60 ? 'bg-gate-soft text-gate' :
              'bg-analysis-soft text-analysis'}`}>
            {icon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">{action.title}</p>
          <p className="text-xs text-ink/50 mt-0.5 leading-snug">{action.message}</p>
          {action.roomType && (
            <span className="mt-1.5 inline-block rounded-full bg-paper border border-hairline px-2 py-0.5 text-[11px] text-ink/55 font-medium">
              {action.roomType}
            </span>
          )}
        </div>

        {/* Action button */}
        {action.kind !== 'complete' && (
          <button
            onClick={handleExecute}
            disabled={busy || disabled}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all
              ${isUpload
                ? 'bg-ink text-paper hover:bg-ink/80'
                : 'bg-analysis text-white hover:bg-analysis/85'}
              disabled:opacity-40`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              action.ctaLabel || 'Run'
            )}
          </button>
        )}

        {action.kind === 'complete' && (
          <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-approved">
            <CheckCircle2 className="h-4 w-4" />
            Done
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-skip shrink-0 mt-0.5" />
          <p className="text-xs text-skip leading-snug">{error}</p>
        </div>
      )}
    </div>
  );
}

interface GuidedActionsProps {
  guidance: PropertyGuidance;
  /** Map from photoId → photo URL for thumb rendering */
  photoUrlMap: Map<string, string>;
  toolJobs: ToolJob[];
  onExecute: (actionId: string) => Promise<void>;
  onExecuteAll?: () => Promise<void>;
  onUploadTrigger?: (roomType: string | null, photoId: string | null) => void;
  onReviewJob: (jobId: string, decision: 'accept' | 'reject') => Promise<void>;
  onRetryJob: (jobId: string) => Promise<void>;
  disabled?: boolean;
}

const TOOL_NAMES: Record<string, string> = {
  photo_enhancement: 'Photo enhancement',
  defurnishing: 'Defurnishing',
  smart_editing: 'Smart editing',
  multi_image_analysis: 'Photo-set review',
  floor_plan_recognition: 'Floor-plan recognition',
  virtual_staging: 'Furniture suggestion',
  listing_copy: 'Listing preparation',
  content_moderation: 'Content review',
};

function ResultPreview({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-hairline bg-surface p-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            {key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-ink/70">
            {Array.isArray(value)
              ? value
                  .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
                  .join('\n')
              : typeof value === 'object' && value !== null
                ? JSON.stringify(value, null, 2)
                : String(value ?? '')}
          </p>
        </div>
      ))}
    </div>
  );
}

export function GuidedActions({
  guidance,
  photoUrlMap,
  toolJobs,
  onExecute,
  onExecuteAll,
  onUploadTrigger,
  onReviewJob,
  onRetryJob,
  disabled,
}: GuidedActionsProps) {
  const [runningAll, setRunningAll] = useState(false);
  const [runAllError, setRunAllError] = useState<string | null>(null);

  const readiness = READINESS_CONFIG[guidance.readiness];
  const toolActions = guidance.actions.filter((a) => a.kind === 'tool' || a.kind === 'review' || a.kind === 'reupload');
  const uploadActions = guidance.actions.filter((a) => a.kind === 'upload');
  const hasToolActions = toolActions.length > 0;

  async function handleRunAll() {
    if (!onExecuteAll) return;
    setRunAllError(null);
    setRunningAll(true);
    try {
      await onExecuteAll();
    } catch (err) {
      setRunAllError(err instanceof Error ? err.message : 'Some actions failed');
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {guidance.actions.length === 0 ? (
        <div className="rounded-xl border border-approved/30 bg-approved-soft p-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-approved shrink-0" />
          <div>
            <p className="font-semibold text-approved">All done</p>
            <p className="text-xs text-ink/55 mt-0.5">No actions needed — this listing looks great.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold">Guided actions</h2>
              <p className={`text-xs font-semibold mt-0.5 ${readiness.color}`}>
                {readiness.label} · {guidance.actions.length} action{guidance.actions.length !== 1 ? 's' : ''}
              </p>
            </div>
            {hasToolActions && onExecuteAll && (
              <button
                onClick={handleRunAll}
                disabled={runningAll || disabled}
                className="flex items-center gap-2 rounded-xl bg-ink text-paper px-4 py-2 text-xs font-semibold hover:bg-ink/80 disabled:opacity-40 transition-all"
              >
                {runningAll ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running all…</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" /> Fix all</>
                )}
              </button>
            )}
          </div>

          {runAllError && (
            <div className="flex items-start gap-2 rounded-xl bg-skip-soft border border-skip/20 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-skip shrink-0 mt-0.5" />
              <p className="text-xs text-skip leading-snug">{runAllError}</p>
            </div>
          )}

          {/* Upload actions first */}
          {uploadActions.map((action) => (
            <ActionCard
              key={action.actionId}
              action={action}
              photoThumb={action.photoId ? (photoUrlMap.get(action.photoId) ?? null) : null}
              onExecute={onExecute}
              onUploadTrigger={onUploadTrigger}
              disabled={disabled}
            />
          ))}

          {/* Tool / review actions */}
          {toolActions.map((action) => (
            <ActionCard
              key={action.actionId}
              action={action}
              photoThumb={action.photoId ? (photoUrlMap.get(action.photoId) ?? null) : null}
              onExecute={onExecute}
              onUploadTrigger={onUploadTrigger}
              disabled={disabled || runningAll}
            />
          ))}
        </>
      )}

      {/* Tool activity — jobs that are running, awaiting review, or finished.
          This is the only place a generated enhancement/defurnish/staging
          result can be seen and accepted or rejected before it replaces
          anything. Do not remove without replacing this capability. */}
      {toolJobs.length > 0 && (
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h2 className="font-display text-base font-bold mb-3">Tool activity</h2>
          <div className="space-y-2">
            {toolJobs.slice(0, 5).map((job) => (
              <div key={job._id} className="rounded-md bg-paper px-3 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold">{TOOL_NAMES[job.tool]}</p>
                    <p className="mt-0.5 text-[11px] text-ink/50">{job.message}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/50">
                    {job.status.replaceAll('_', ' ')}
                  </span>
                </div>
                {job.status === 'ready_for_review' && job.resultData && <ResultPreview data={job.resultData} />}
                {job.status === 'ready_for_review' && job.resultType === 'image' && job.resultUrl && (
                  <div className="mt-3 overflow-hidden rounded-md border border-hairline bg-panel">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={resolvePhotoUrl(job.resultUrl)}
                        alt={`${TOOL_NAMES[job.tool]} preview`}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <p className="border-t border-hairline bg-surface px-3 py-2 text-[11px] text-ink/50">
                      Generated preview · The original is preserved until you accept.
                    </p>
                  </div>
                )}
                {job.status === 'ready_for_review' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void onReviewJob(job._id, 'accept')}
                      className="rounded-sm bg-approved px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void onReviewJob(job._id, 'reject')}
                      className="rounded-sm border border-hairline bg-surface px-3 py-1.5 text-[11px] font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {(job.status === 'failed' || job.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => void onRetryJob(job._id)}
                    className="mt-3 text-[11px] font-semibold text-analysis hover:underline"
                  >
                    Retry task
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
