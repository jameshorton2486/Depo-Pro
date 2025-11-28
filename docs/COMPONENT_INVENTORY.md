# Depo-Pro Component Inventory

## Layout Components
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Header | `components/layout/header.tsx` | ❌ Missing | Layout is provided by `app/(dashboard)/layout.tsx` + navbar; no standalone header component yet. |
| Sidebar | `components/layout/sidebar.tsx` | ❌ Missing | Navigation relies on the top navbar only; no sidebar implementation. |
| Footer | `components/layout/footer.tsx` | ❌ Missing | Public landing page includes inline footer copy but no reusable component. |

## Authentication Components
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| LoginForm | `components/auth/login-form.tsx` | ❌ Missing | Login UI is hardcoded in `app/(auth)/login/page.tsx`; consider extracting for reuse/testing. |
| RegisterForm | `components/auth/register-form.tsx` | ❌ Missing | Registration page handles form logic directly, including client-side hashing. |

## Job Components
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| JobCard | `components/jobs/job-card.tsx` | ✅ Complete | Presentational card with JobStatusBadge; no TODOs. |
| JobList | `components/jobs/job-list.tsx` | ❌ Missing | `/jobs` route still shows placeholder copy; no reusable list component exists. |
| JobForm | `components/jobs/job-form.tsx` | ⚠️ Partial | Handles create/edit but lacks firm chooser, attachment controls, and richer error feedback. |
| JobDetail | `components/jobs/job-detail.tsx` | ❌ Missing | Detail layout lives entirely in the server page (`app/(dashboard)/jobs/[id]/page.tsx`). |
| FileUpload | `components/jobs/file-upload.tsx` | ⚠️ Partial | Functional UI, but upload/delete rely on local storage mocks; no progress or multi-file UX. |
| AssignmentManager | `components/jobs/assignment-management.tsx` | ⚠️ Partial | UI shell with mock data and TODOs; needs live API wiring and optimistic updates. |

## Transcript Components
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| TranscriptViewer | `components/transcripts/transcript-viewer.tsx` | ⚠️ Partial | Renders content but lacks audio sync, flagged word highlighting, or pagination. |
| TranscriptEditor | `components/transcripts/transcript-editor.tsx` | ⚠️ Partial | TipTap-based editor with toolbar; save/collaboration hooks are marked TODO. |
| AudioPlayer | `components/transcripts/audio-player.tsx` | ✅ Complete | WaveSurfer-driven player with scrubbing, speed, and volume controls. |
| LowConfidenceReview | `components/transcripts/low-confidence-review.tsx` | ❌ Missing | Core MVP component for flagged word workflow has not been created. |

## Shared/UI Components
| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| Button | `components/ui/button.tsx` | ✅ Complete | ShadCN-style button component. |
| Input | `components/ui/input.tsx` | ✅ Complete | Basic styled input used across forms. |
| Modal | `components/ui/modal.tsx` | ❌ Missing | Dialogs are implemented inline; no reusable modal abstraction exists. |
| Toast | `components/ui/toast.tsx` | ❌ Missing | App calls `sonner` directly; consider wrapping for consistent styling. |
