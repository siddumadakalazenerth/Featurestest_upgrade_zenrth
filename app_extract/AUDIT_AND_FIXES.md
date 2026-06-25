# v0 Port — Audit & Fix Report

v0 ran out of credits at "Task 2 of 4." Before completing the remaining two
files, I audited everything it had already written against the four hard
constraints. **Three of the four constraints were violated**, one severely.
This document lists every issue found, exactly as found, and what was
changed to fix it.

## Constraint #1 — lib/types.ts and lib/api.ts copied verbatim

**Status: VIOLATED, then fixed.**

v0 did not copy these files verbatim. It rewrote both with an invented API
surface that has no corresponding backend route:

- `executeAllActions`, `provideFurnishingDimensions`,
  `verifyCustomFurnishing`, `customEditPhoto`, `setRoomSubtype` — none of
  these exist on the backend. Calling any of them would hit a 404.
- New types invented to match: `virtual_staging_render`, `custom_edit`,
  `dimensions_input`, `roomSubtype`, `colorPalette`, `lightingMood`,
  `windowTreatments` — all fictional, all unsupported server-side.
- **The entire auth system was deleted**: `AuthUser`, `getAuthToken`,
  `setAuthToken`, and the `Authorization: Bearer` header on every request.
  Every API call from the redesigned app would have hit the backend with
  no token and been rejected by `requireAuth` middleware.

**Fix:** both files restored to byte-identical with the original zip.
Verified with `diff` — exit code 0 on both files.

The one good idea in the invented surface — a "Fix all" batch button — is
real and worth keeping. It's now implemented as a client-side loop calling
the real `api.executeAction()` once per action, sequentially, inside
`app/listings/[id]/page.tsx`. No backend changes, no fictional endpoint.

## Constraint #2 — event wiring + furnishing-suggestion rendering

**Status: VIOLATED, then fixed.**

Zero occurrences of `CustomEvent`, `zenrth:upload-request`, or
`zenrth:focus-photo` anywhere in v0's output. The entire furnishing
suggestion feature — the thing built in the previous session, accept/dismiss
buttons, dimension estimate, piece list — was gone from `PhotoCarousel.tsx`.
Not displaced, not relocated. Absent.

This wasn't a side effect of the visual redesign — v0 restructured the
carousel from an always-visible inline component into a full-screen modal
(`initialPhotoId` + `onClose`, opened by clicking a thumbnail in a new
`RoomGallery` grid component). That's a legitimate, well-built UX pattern.
But the furnishing suggestion UI, the cover-photo/move/restore-original
actions, and the cross-component event wiring all needed to be re-added
into this new architecture, not just copy-pasted back.

**Fix:**
- `PhotoCarousel.tsx` — restored the furnishing suggestion block (dimensions
  with confidence basis, style, piece list with placement/reasoning,
  accept/dismiss buttons) inside the modal's right-hand analysis panel.
  Restored `onSetCover`, `onMove`, `onRestoreOriginal` actions and buttons.
- `app/listings/[id]/page.tsx` (newly written) — both event names and
  payload shapes preserved exactly. The *meaning* of `zenrth:focus-photo`
  adapted correctly for the new architecture: it now opens the modal
  directly to that photo (`setOpenPhotoId`) instead of scrolling an inline
  carousel to an index, since the inline carousel no longer exists.

## Constraint #3 — id="property-upload" / id="property-photos" placement

**Status: Unverifiable at the time (page didn't exist), now satisfied.**

Couldn't be checked because `app/listings/[id]/page.tsx` didn't exist yet.

**Fix:** both ids are present in the newly written page, each as a direct
wrapper around its real target content — not on an outer layout container,
not buried on an inner child.

## Constraint #4 — delete modal (dashboard)

**Status: Already satisfied — no fix needed.**

`app/page.tsx`'s `DeleteModal` was built correctly: state stores the full
listing object (not just an ID, which is actually better — it gives the
modal copy access to the title directly), all three dismissal paths
(Cancel button, Escape key, backdrop click via `stopPropagation`) call only
`setDeleteTarget(null)`, and the confirm path calls the real delete API.

The detail page's delete-listing flow had no modal at all (the page didn't
exist). Added `DeleteListingModal` in `app/listings/[id]/page.tsx` following
the identical pattern, with the `address ?? title ?? "this listing"` style
fallback discussed earlier — implemented here as `title || 'this listing'`
since a `Listing`'s `title` field is required and always present, so the
fallback only covers the theoretical empty-string case.

## Severe issue not in the original four constraints: auth was gone entirely

`AuthGuard.tsx` had been reduced to:
```tsx
export function AuthGuard({ children }) { return <>{children}</>; }
```
A no-op. Not imported anywhere in `layout.tsx` either — so even this stub
was dead code. There was no `app/login/page.tsx` in v0's output. The
original codebase's real login page and real `AuthGuard` (token check +
`/api/auth/me` validation + redirect) had simply not been ported.

**Fix:**
- `components/AuthGuard.tsx` — restored real logic from the original.
- `app/login/page.tsx` — restored, restyled to match the new visual
  language (rounded-xl inputs, Lucide spinner), logic untouched.
- `app/layout.tsx` — `AuthGuard` is now actually wired around `children`.
- `components/Header.tsx` — added a sign-out button. This is a genuine
  *new* addition, not a restoration — the original never had one either.
  Implemented with `useEffect` + state rather than a direct `localStorage`
  read during render, to avoid a hydration mismatch (server always renders
  signed-out, client would then immediately flip — caught this myself
  before shipping it).

## Real bugs found in v0's own code, unrelated to the constraints

- **`GuidedActions.tsx` priority color thresholds were inverted.** v0 wrote
  `action.priority <= 1` / `<= 3` for the urgent/warning border colors. The
  real backend (`propertyAssessmentService.js`) assigns priority 0–100 with
  **higher = more urgent** (reupload = 92, content moderation = 96, missing
  required room = 100). Every action card would have rendered with the
  lowest-urgency gray border regardless of actual priority. Fixed to
  `>= 90` / `>= 60`, confirmed against the real priority values in the
  backend source.
- **`React.ReactNode`, `React.DragEvent`, `React.ChangeEvent`,
  `React.FormEvent` referenced without importing React as a namespace** in
  `GuidedActions.tsx`, `UploadDropzone.tsx`, `NewListingForm.tsx`, and
  `app/layout.tsx`. Harmless at runtime with the real React types installed,
  but breaks under strict standalone type-checking. Fixed by importing the
  specific types (`type ReactNode`, `type DragEvent`, etc.) instead of
  relying on the global namespace.
- **`needsPrompt` logic in `GuidedActions.tsx` treated `virtual_staging` as
  always requiring a custom text prompt**, opening an expandable textarea
  before running it. The real backend's `runFurnishingSuggestion` takes no
  custom input — it's a single click, same as every other tool action. This
  would have added a confusing, unnecessary step to a flow that's supposed
  to be one click. Removed the prompt-gating entirely, since there is
  currently no tool in the real backend that needs one.

## Known limitation, not fixed (would require a backend change)

`components/ListingCard.tsx` cannot show a real cover-photo thumbnail
because `ListingSummary` (returned by `GET /api/listings`) doesn't include
any photo URL field. v0 left this honestly degraded — a gradient
placeholder with a comment explaining why, rather than faking a thumbnail.
I left this as-is. Fixing it for real means extending the backend's listing
list endpoint to include a `coverPhotoUrl`, which is a backend change, not
a frontend one — worth doing as a follow-up, not bundled into this fix pass.

## What was NOT touched

Everything confirmed purely presentational and not on the constraint list
was left as v0 built it: Tailwind v4 tokens in `globals.css`, Space Grotesk
+ Inter fonts, Lucide icons throughout, `RoomGallery`'s room-grouped grid
layout, `ListingCard`'s skeleton loading and progress bar, the dashboard's
modal-based `NewListingForm`, `CostSummaryPanel`, `PipelineStrip`,
`MissingRoomsAlert`, `StatusBadge`, `QualityGauge`, `WorkspaceStatus`.

## Testing status

Same limitation as every prior session: no outbound network access, so no
`npm install`, no live MongoDB, no real Gemini key, no actual browser
render. Every `.ts`/`.tsx` file in the project was checked with the
TypeScript compiler directly; the complete sweep is clean except for the
one confirmed false-positive pattern (missing `key`/`children` prop
recognition without real `@types/react` installed — present in files this
session never touched, confirming it's an environment artifact, not a code
defect).

The 11-item manual checklist from the prior plan still applies and is now
actually testable, since the missing page exists. Given how much was wrong
in the parts that looked finished, I'd treat that checklist as load-bearing,
not a formality — especially items 1–3 (delete modal triple-path), 7–8
(furnishing suggestion accept/dismiss, since that JSX block had been fully
deleted once already), and the real end-to-end Gemini upload.
