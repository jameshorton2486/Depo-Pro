# Keyterm Expansion Notes

## Task 2 — Medical provider source check

The current `CaseRecord` shape does not expose a dedicated first-class `medical_providers` field or array. On the live path, provider names can still reach deterministic keyterms through existing structures that already exist on the case record:

- `participants[].name` and `participants[].organization` when a provider is entered as a generic participant
- `witnesses[].employer` when an expert witness carries a provider or practice affiliation

That means there is no schema change to make in this prompt, but there is still a gap for a future stage: if DEPO-PRO needs explicit medical-provider harvesting separate from generic participants, it will need a dedicated case-record field with a documented downstream consumer before keyterm derivation can treat it as a first-class source.
