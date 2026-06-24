'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface NewListingFormProps {
  onCreate: (title: string, address: string, requiredRoomTypes: string[]) => Promise<void>;
  variant?: 'primary' | 'ghost';
}

type PropertyType = 'apartment' | 'house' | 'villa';
type BHK = '1BHK' | '2BHK' | '3BHK' | '4BHK' | '5BHK+';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'Independent House' },
  { value: 'villa', label: 'Villa' },
];

const BHK_OPTIONS: Record<PropertyType, BHK[]> = {
  apartment: ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK+'],
  house:     ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK+'],
  villa:     ['3BHK', '4BHK', '5BHK+'],
};

const REQUIRED_ROOMS: Record<PropertyType, Record<BHK, string[]>> = {
  apartment: {
    '1BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Exterior'],
    '2BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Exterior'],
    '3BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Exterior'],
    '4BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Exterior'],
    '5BHK+': ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Exterior'],
  },
  house: {
    '1BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Exterior'],
    '2BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Exterior', 'Garage'],
    '3BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Exterior', 'Garage'],
    '4BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Exterior', 'Garage'],
    '5BHK+': ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Hallway', 'Exterior', 'Garage'],
  },
  villa: {
    '1BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Exterior'],
    '2BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Exterior'],
    '3BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Exterior', 'Garage'],
    '4BHK':  ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Exterior', 'Garage'],
    '5BHK+': ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Balcony', 'Hallway', 'Exterior', 'Garage'],
  },
};

export function NewListingForm({ onCreate, variant = 'primary' }: NewListingFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [bhk, setBhk] = useState<BHK>('2BHK');
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const expectedRooms = REQUIRED_ROOMS[propertyType][bhk] ?? [];

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  // Reset BHK to a valid option when property type changes
  useEffect(() => {
    const validBhk = BHK_OPTIONS[propertyType];
    if (!validBhk.includes(bhk)) setBhk(validBhk[0]);
  }, [propertyType, bhk]);

  function close() {
    setOpen(false);
    setTitle('');
    setAddress('');
    setPropertyType('apartment');
    setBhk('2BHK');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate(title.trim(), address.trim(), expectedRooms);
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          variant === 'primary'
            ? 'bg-ink text-paper hover:bg-ink/85 shadow-sm hover:shadow'
            : 'border border-hairline bg-surface text-ink/70 hover:border-analysis/50 hover:text-analysis'
        }`}
      >
        <Plus className="h-4 w-4" />
        New listing
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => !busy && close()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold">New listing</h2>
                <p className="text-xs text-ink/45 mt-0.5">Tell us about the property to get started.</p>
              </div>
              <button
                onClick={() => !busy && close()}
                disabled={busy}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-paper transition-colors text-ink/40 hover:text-ink disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col gap-4">
              {/* Property type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Property type</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setPropertyType(pt.value)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all
                        ${propertyType === pt.value
                          ? 'border-analysis bg-analysis-soft text-analysis'
                          : 'border-hairline text-ink/60 hover:border-analysis/40 hover:text-ink'}`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BHK */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Configuration</label>
                <div className="flex gap-2 flex-wrap">
                  {BHK_OPTIONS[propertyType].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBhk(b)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all
                        ${bhk === b
                          ? 'border-analysis bg-analysis-soft text-analysis'
                          : 'border-hairline text-ink/60 hover:border-analysis/40 hover:text-ink'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected rooms preview */}
              <div className="rounded-xl border border-hairline bg-paper px-4 py-3">
                <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">
                  Expected photos for this listing
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {expectedRooms.map((room) => (
                    <span
                      key={room}
                      className="rounded-full border border-analysis/30 bg-analysis-soft px-2.5 py-0.5 text-[11px] font-medium text-analysis"
                    >
                      {room}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="listing-title" className="text-xs font-semibold text-ink/60 uppercase tracking-wide">
                  Listing title <span className="text-skip">*</span>
                </label>
                <input
                  ref={titleRef}
                  id="listing-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g. ${bhk} ${PROPERTY_TYPES.find(p => p.value === propertyType)?.label}, Banjara Hills`}
                  className="rounded-xl border border-hairline bg-paper px-4 py-3 text-sm focus:outline-none focus:border-analysis/60 focus:ring-2 focus:ring-analysis/15 transition-all"
                  required
                />
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="listing-address" className="text-xs font-semibold text-ink/60 uppercase tracking-wide">
                  Address <span className="text-ink/30">(optional)</span>
                </label>
                <input
                  id="listing-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Road No. 12, Hyderabad 500034"
                  className="rounded-xl border border-hairline bg-paper px-4 py-3 text-sm focus:outline-none focus:border-analysis/60 focus:ring-2 focus:ring-analysis/15 transition-all"
                />
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => !busy && close()}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-hairline px-4 py-3 text-sm font-semibold text-ink/60 hover:bg-paper transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !title.trim()}
                  className="flex-1 rounded-xl bg-analysis px-4 py-3 text-sm font-semibold text-white hover:bg-analysis/90 disabled:opacity-50 transition-all shadow-sm"
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    'Create listing'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
