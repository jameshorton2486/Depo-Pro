# ADR-0007 — Reactive Authentication Ownership

## Status

Accepted. Implemented by PR #35 (`fix/root-lifecycle-stability`). First application of DTAS §7A Principle 1 — Reactive State Ownership.

## Context

The standalone bootstrap (`src/main.tsx`) re-invoked `renderEditor()` — a full `editorRoot.render(<DepoEditor/>)` — from the Supabase `onAuthStateChange` handler on **every** auth event. On load, `initializeSupabaseSession` sets the session from config tokens, so `supabase-js` emits `INITIAL_SESSION` + `SIGNED_IN` + `TOKEN_REFRESHED`; each re-rendered the application root. This surfaced as the console line `[DEPO-PRO] Mounting editor with config` printing ~4×, plus incidental WaveSurfer `AbortError` noise from teardown races.

Verification established that this propagation path was **redundant**, not a required state update:

- **The UI already owns auth reactively.** `AuthGate` reads the session via `useSyncExternalStore(subscribeAuthState, getAuthSnapshot)` — a live subscription to the auth store. Sign-in and sign-out re-render the consumers that subscribe, without any root reconstruction.
- **The API layer retrieves tokens lazily.** `client.ts` `request()` calls `getAccessToken()` → `getSupabaseAccessToken()` on **every** request, so a refreshed token is picked up per-call. Token refresh needs no re-render to propagate.

Therefore the `session` argument threaded through `renderEditor` was needed only for the *initial* mount; steady-state auth events required no reconstruction of the editor, the audio player, or the document model.

## Decision

- **Authentication is owned by `AuthGate`** and published as a reactive session store; the API layer reads a fresh token per request.
- **The application root is not reconstructed during auth lifecycle events.** The `onAuthStateChange` handler acts only on **sign-out** (redirect to login). Token refresh and sign-in propagate through the store and the per-request token, not through `renderEditor`.
- The now-dead `currentConfig` / `currentApiBaseUrl` module state (its only readers were the removed re-render path) is deleted.

## Consequences

- **Reduced render churn** — the root renders once at mount instead of on every auth event.
- **Stable component identity** — the editor, audio player, and document model keep their instances across token refreshes; no lifecycle races from repeated root renders.
- **Cleaner ownership boundaries** — authentication publishes; consumers subscribe. Auth no longer reaches across into unrelated domains to force their reconstruction.
- Operational hygiene (same PR): the initial `ws.load()` in `AudioPlayer` now swallows the expected teardown `AbortError`; genuine failures still route through the idempotent `handleRecoverableError` and the WaveSurfer `error` event.

## Architectural Impact

**Affected DTAS Principles:** §7A Principle 1 — Reactive State Ownership (this ADR is its first application).

**Affected owners:** Authentication; Presentation (the application root and component lifecycle).

**Unaffected owners:** Canonical Transcript Model, Semantic Interpretation, Editorial, Legal Structure, Render Model, Recognition. No transcript evidence, overlay, derivation, or output is touched — this decision is confined to runtime state propagation.

## Alternatives considered

- **Memoize the config object** so re-renders reconcile cheaply. Rejected: it treats the symptom (churn) rather than the cause (a cross-cutting service reconstructing unrelated domains), and leaves the ownership inversion in place.
- **Diff the session and re-render only on token change.** Rejected: the token does not need to reach React at all — the API layer reads it per request — so any re-render on token change is unnecessary work.

## References

- DTAS v1.0 §7A, Principle 1 — Reactive State Ownership.
- DTAS v1.0 §7, Law 1 (one canonical model) and Law 8 (single authority) — the intent this Principle applies to runtime state propagation.
- PR #35 — `fix/root-lifecycle-stability`.
