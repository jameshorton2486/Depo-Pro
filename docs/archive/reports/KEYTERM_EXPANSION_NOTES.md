# Keyterm Expansion Notes

## Task 2 — Medical provider source check

The current `CaseRecord` shape does not expose a dedicated first-class `medical_providers` field or array. On the live path, provider names can still reach deterministic keyterms through existing structures that already exist on the case record:

- `participants[].name` and `participants[].organization` when a provider is entered as a generic participant
- `witnesses[].employer` when an expert witness carries a provider or practice affiliation

That means there is no schema change to make in this prompt, but there is still a gap for a future stage: if DEPO-PRO needs explicit medical-provider harvesting separate from generic participants, it will need a dedicated case-record field with a documented downstream consumer before keyterm derivation can treat it as a first-class source.

## Task 3 — Cap and token-budget check

Using the broadened Garza-style fixture against the live deterministic derivation path, the expanded harvest now yields 63 included terms, 0 dropped terms, and 188 estimated tokens. That stays well inside the existing preflight soft caps (`90` terms / `400` estimated tokens) and the downstream Deepgram hard caps (`100` terms / `500` tokens), so no payload-shape change or cap change was required in this prompt.

Overflow behavior therefore remains unchanged and deterministic: if a future richer case does exceed the soft cap, `deriveKeytermsWithBudget()` will drop the lowest-priority tail first while keeping all-or-nothing person groups intact. For the current broadened case-data harvest, the expanded organizations still fit without displacing higher-priority witness, party, or attorney terms.
