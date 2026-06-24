import { CheckCircle, AlertCircle } from 'lucide-react';

interface MissingRoomsAlertProps {
  missingRoomTypes: string[];
}

export function MissingRoomsAlert({ missingRoomTypes }: MissingRoomsAlertProps) {
  if (missingRoomTypes.length === 0) {
    return (
      <div className="rounded-xl border border-approved/30 bg-approved-soft px-4 py-3 flex items-center gap-3">
        <CheckCircle className="h-4 w-4 text-approved shrink-0" />
        <div>
          <span className="text-sm font-semibold text-approved">Checklist complete</span>
          <span className="text-sm text-ink/60 ml-2">Every required room type has at least one usable photo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gate/30 bg-gate-soft px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <AlertCircle className="h-4 w-4 text-gate shrink-0" />
        <p className="text-sm font-semibold text-gate">Missing room types</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {missingRoomTypes.map((room) => (
          <span
            key={room}
            className="px-2.5 py-1 rounded-full bg-surface border border-gate/30 text-xs font-medium text-ink/80"
          >
            {room}
          </span>
        ))}
      </div>
      <p className="text-xs text-ink/45 mt-2.5">
        Derived from the room types Gemini has already classified.
      </p>
    </div>
  );
}
