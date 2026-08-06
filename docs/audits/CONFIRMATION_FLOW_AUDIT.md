# Confirmation Flow Audit

## Data model

Every `ExtractedField<T>` stores `value`, `source`, `confirmed`, `conflict`, and `confidence_score`. The contract comment defines `confirmed` as explicit reporter confirmation. The model does not store whether confirmation was manual or automatic, who confirmed it, or which normalization policy/version produced the value.

## Current decision tree

```text
Incoming update
  -> compare serialized value with existing value
  -> same value: retain existing field unchanged
  -> different value and existing is confirmed and source differs and force=false
       -> retain existing value/source/confirmation
       -> set conflict=true
  -> otherwise
       -> accept incoming value/source/confidence
       -> confirmed=false
       -> conflict=false

Projection
  -> conflict=true                         => Conflict
  -> empty and required                    => Missing
  -> confirmed=true                        => Confirmed
  -> otherwise                             => Needs Confirmation

Reporter action
  -> CONFIRM_FIELD                         => confirmed=true, conflict=false
  -> CONFIRM_ALL recursively               => confirmed=true, conflict=false
  -> RESOLVE_CONFLICT accepted value       => confirmed=true, conflict=false
```

“Manual” is a source/display-source classification, not a confirmation status. A manual edit normally enters through `UPDATE_FIELD`; unless another UI action confirms it, the reducer resets `confirmed` to false. “Notice,” “Job Sheet,” and “Reporter Profile” are presentation/provenance labels mapped onto the coarser domain sources.

## Confidence flow

1. `extract-nod` returns per-field confidence from 0 to 1 and caps inferred values at 0.6 by instruction.
2. Extraction field objects retain confidence through `applyExtraction`.
3. `ExtractionApplication.fieldUpdates` carries `confidence_score` to the reducer and provenance recording.
4. `CaseRecord.ExtractedField.confidence_score` persists with the field.
5. Field projection exposes confidence to the review UI.
6. Confirmation changes the `confirmed` flag but does not erase confidence.
7. UFM emits confirmation booleans but does not emit the complete field confidence map; provenance is consulted primarily for source selection.
8. Export paths do not consistently gate or annotate every value by confidence.

## Threshold finding

There is no canonical 95% auto-confirm threshold in the Intake reducer or projection. A 0.95 extracted value remains “Needs Confirmation” unless explicitly confirmed. The best future location is a centralized confirmation policy invoked **after canonical normalization and conflict detection, before committing the field to the working model**.

Recommended rule:

```text
if conflict: unconfirmed + Conflict
else if source is extracted and confidence >= configured threshold (default 0.95)
     and field policy permits auto-confirmation:
       confirmed + method=automatic
else:
       unconfirmed + Needs Confirmation
```

This must not be embedded in field projection: doing so would make a field look confirmed without persisting the decision. It must not run before conflict detection: confidence must never override a confirmed competing source.

Because the frozen API field shape lacks `confirmation_method`, the implementation should use a separate local metadata/audit type and document any contract deviation rather than reshaping frozen contract types.

## Conflict and provenance

- Reducer conflict detection is the working-model enforcement point.
- It only flags an incoming different-source value when the existing value is already confirmed and nonempty.
- `applyExtraction` also precomputes conflicts and extraction persistence writes provenance/conflict records through services.
- Conflict UI alternatives are projected from provenance records.
- Manual force updates can bypass conflict detection.
- Case-level source is coarse (`manual`, `extracted`, `imported`); UI provenance refines it to Notice, Job Sheet, Reporter Profile, and Manual.

Therefore there are two related sources of truth: the `ExtractedField` is authoritative for the current working value/conflict flag, while provenance storage is authoritative for source history and alternate values. They are coordinated but not represented as one atomic domain object.

## Risks

- A high-confidence value is not automatically confirmed today.
- `CONFIRM_ALL` clears conflicts recursively, which can collapse a conflict without the same explicit alternate-choice semantics as `RESOLVE_CONFLICT`.
- Same-value updates retain prior source/confidence rather than recording the new supporting source in the field leaf.
- The coarse `extracted` source cannot alone distinguish Notice from Job Sheet.
- UFM profile substitution treats effective profile fields as confirmed even when the working record field itself is not confirmed.

