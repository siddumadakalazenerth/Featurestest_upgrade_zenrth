'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-hairline bg-surface/95 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-0" style={{ height: '56px' }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Teal accent mark */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-analysis">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight group-hover:text-analysis transition-colors">
            Zenrth
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs text-ink/35 font-medium tracking-wide">
            Photo Pipeline
          </span>
        </div>
      </div>
    </header>
  );
}
