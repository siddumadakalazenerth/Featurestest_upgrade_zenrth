import type {
  CostSummary,
  FurnishingSuggestion,
  Listing,
  ListingDetail,
  ListingSummary,
  Photo,
  PublicationChecklist,
  ToolJob,
  WorkspaceActivity,
  AssetVersion,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? { ...init.headers }
        : {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function resolvePhotoUrl(url: string): string {
  // Photo/AssetVersion URLs are now full Vercel Blob URLs (e.g.
  // https://xyz.public.blob.vercel-storage.com/...), not relative paths
  // served by this API. Only prefix with API_BASE for the old-style
  // relative path, kept here only so any already-stored old records with a
  // "/uploads/..." url don't render as a broken image.
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

export const api = {
  health: () => request<{ ok: boolean; geminiConfigured: boolean; pipeline: Record<string, number> }>('/api/health'),

  workspaceActivity: () => request<WorkspaceActivity>('/api/listings/workspace/activity'),

  listListings: () => request<ListingSummary[]>('/api/listings'),

  createListing: (title: string, address: string, requiredRoomTypes?: string[]) =>
    request<Listing>('/api/listings', {
      method: 'POST',
      body: JSON.stringify({ title, address, requiredRoomTypes }),
    }),

  getListing: (listingId: string) => request<ListingDetail>(`/api/listings/${listingId}`),

  deleteListing: (listingId: string) =>
    request<void>(`/api/listings/${listingId}`, { method: 'DELETE' }),

  executeAction: (listingId: string, actionId: string, prompt?: string) =>
    request<
      | { type: 'upload'; roomType: string | null; photoId: string | null; message: string }
      | { type: 'tool_job'; job: ToolJob }
      | { type: 'furnishing_suggestion'; photoId: string | null; suggestion: FurnishingSuggestion }
    >(`/api/listings/${listingId}/actions/${encodeURIComponent(actionId)}/execute`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  reviewToolJob: (listingId: string, jobId: string, decision: 'accept' | 'reject') =>
    request<ToolJob>(`/api/listings/${listingId}/tool-jobs/${jobId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  retryToolJob: (listingId: string, jobId: string) =>
    request<ToolJob>(`/api/listings/${listingId}/tool-jobs/${jobId}/retry`, {
      method: 'POST',
    }),

  updateListingCopy: (
    listingId: string,
    copy: Listing['listingCopy']
  ) =>
    request<Listing>(`/api/listings/${listingId}/listing-copy`, {
      method: 'PUT',
      body: JSON.stringify(copy),
    }),

  publishListing: (listingId: string) =>
    request<{ listing: Listing; publication: PublicationChecklist }>(
      `/api/listings/${listingId}/publish`,
      { method: 'POST' }
    ),

  updateGallery: (listingId: string, photoIds: string[], coverPhotoId: string) =>
    request<Photo[]>(`/api/listings/${listingId}/gallery`, {
      method: 'PUT',
      body: JSON.stringify({ photoIds, coverPhotoId }),
    }),

  exportListing: async (listingId: string) => {
    const response = await fetch(`${API_BASE}/api/listings/${listingId}/export`);
    if (!response.ok) throw new Error('Could not export this property.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zenrth-${listingId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  uploadPhotos: (listingId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    return request<{ uploaded: Photo[]; queued: number; missingRoomTypes: string[]; costSummary: CostSummary }>(
      `/api/listings/${listingId}/photos`,
      { method: 'POST', body: form }
    );
  },

  replacePhoto: (listingId: string, photoId: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<Photo>(`/api/listings/${listingId}/photos/${photoId}/replace`, {
      method: 'POST',
      body: form,
    });
  },

  reviewFurnishingSuggestion: (listingId: string, photoId: string, decision: 'accept' | 'dismiss') =>
    request<Photo>(`/api/listings/${listingId}/photos/${photoId}/furnishing-suggestion/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  reanalyzePhoto: (photoId: string) =>
    request<Photo>(`/api/photos/${photoId}/reanalyze`, { method: 'POST' }),

  updatePhotoRoomType: (photoId: string, roomType: string) =>
    request<Photo>(`/api/photos/${photoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ roomType }),
    }),

  triggerVirtualStaging: (listingId: string, photoId: string, prompt?: string) =>
    request<ToolJob>(`/api/listings/${listingId}/photos/${photoId}/virtual-staging`, {
      method: 'POST',
      body: JSON.stringify({ prompt: prompt ?? '' }),
    }),

  deletePhoto: (photoId: string) => request<void>(`/api/photos/${photoId}`, { method: 'DELETE' }),

  listVersions: (photoId: string) => request<AssetVersion[]>(`/api/photos/${photoId}/versions`),

  restoreVersion: (photoId: string, versionId: string) =>
    request<Photo>(`/api/photos/${photoId}/versions/${versionId}/restore`, { method: 'POST' }),
};
