import type { WorkspaceActivity } from '@/lib/types';

export function WorkspaceStatus({ activity }: { activity: WorkspaceActivity }) {
  const percentage = activity.usage.limit
    ? Math.min(100, Math.round((activity.usage.units / activity.usage.limit) * 100))
    : 0;

  const isNearLimit = percentage >= 80;

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-ink/70">Monthly AI usage</p>
          <span className={`font-mono text-xs tabular-nums font-medium ${isNearLimit ? 'text-gate' : 'text-ink/50'}`}>
            {activity.usage.units}/{activity.usage.limit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-hairline">
          <div
            className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-gate' : 'bg-analysis'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink/35">{percentage}% of monthly limit used</p>
      </div>

      <div className="rounded-xl border border-hairline bg-surface p-4">
        <p className="text-xs font-semibold text-ink/70 mb-2">
          {activity.notifications.length
            ? `${activity.notifications.length} notification${activity.notifications.length > 1 ? 's' : ''}`
            : 'Recent activity'}
        </p>
        <p className="text-xs text-ink/50 leading-relaxed">
          {activity.notifications[0]?.message ||
            (activity.events[0]
              ? activity.events[0].action.replaceAll('.', ' ')
              : 'No workspace actions recorded yet.')}
        </p>
      </div>
    </div>
  );
}
