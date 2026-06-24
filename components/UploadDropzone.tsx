'use client';

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';

interface UploadDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export function UploadDropzone({ onUpload, disabled = false }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  const processFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter((f) => f.type.startsWith('image/'));
      if (valid.length === 0) {
        setError('Please select image files (JPEG, PNG, AVIF, WebP, HEIC, etc.).');
        return;
      }
      setError(null);
      const urls = valid.map((f) => URL.createObjectURL(f));
      setPreview(urls);
      setUploading(true);
      try {
        await onUpload(valid);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
        urls.forEach((u) => URL.revokeObjectURL(u));
        setPreview([]);
      }
    },
    [onUpload]
  );

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    processFiles(Array.from(e.dataTransfer.files));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    processFiles(files);
  }

  const isActive = dragging && !disabled && !uploading;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="Upload photos"
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && !uploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer select-none transition-all duration-200
          ${isActive
            ? 'border-analysis bg-analysis-soft scale-[1.01]'
            : disabled || uploading
              ? 'border-hairline bg-paper/60 cursor-not-allowed opacity-60'
              : 'border-hairline bg-surface hover:border-analysis/50 hover:bg-analysis-soft/30'
          }
        `}
        style={{ minHeight: '160px' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="sr-only"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="h-8 w-8 rounded-full border-[3px] border-analysis border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-analysis">Uploading…</p>
            {preview.length > 0 && (
              <div className="flex gap-1.5 mt-1">
                {preview.slice(0, 5).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover opacity-70 border border-hairline"
                  />
                ))}
                {preview.length > 5 && (
                  <span className="h-9 w-9 flex items-center justify-center rounded-lg bg-hairline text-xs text-ink/50 font-semibold border border-hairline">
                    +{preview.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-analysis text-white' : 'bg-hairline text-ink/40'}`}>
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {isActive ? 'Drop to upload' : 'Drag & drop photos'}
              </p>
              <p className="text-xs text-ink/40 mt-0.5">
                or <span className="text-analysis font-medium underline underline-offset-2">browse files</span>
                {' '}· All image formats supported
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-skip-soft border border-skip/20 px-4 py-3">
          <p className="text-xs text-skip leading-snug flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-skip/60 hover:text-skip transition-colors shrink-0 mt-0.5"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
