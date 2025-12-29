# Phase 10: Editor Enhancement Research

> **Status:** ARCHIVED — NOT IN MVP  
> **Target:** Post-Beta (After 10+ paying customers)  
> **Estimated Effort:** 2-4 weeks  
> **Risk Level:** Medium (major UI refactor)

---

## Overview

This phase evaluates and implements an enhanced transcript editor to replace the current custom solution. The decision will be informed by beta user feedback and identified pain points.

---

## Current Solution

The MVP uses a custom transcript viewer built with:
- React 18 components
- shadcn/ui primitives
- Custom audio synchronization hooks
- HTML5 audio element

**Status:** Functional for MVP, meets beta requirements.

---

## Candidate Libraries

### 1. pmacom-react-transcript-editor

**Description:** Modernized fork of BBC react-transcript-editor, specifically updated for React 18/19 compatibility.

**Pros:**
- Purpose-built for transcript editing
- Word-level seeking (click to play)
- TimedTextEditor component
- STT JSON format support
- MIT License

**Cons:**
- May require customization for legal features
- Community maintained (not corporate)

**Integration Effort:** Medium (2 weeks)

**Repository:** github.com/pmacom/react-transcript-editor

---

### 2. Lexical

**Description:** Meta's extensible text editor framework with excellent performance for long documents.

**Pros:**
- Best performance for very long transcripts
- NodeState API for rich metadata
- Actively maintained by Meta
- Highly customizable
- MIT License

**Cons:**
- Steeper learning curve
- Requires building transcript-specific nodes
- More code to write

**Integration Effort:** High (3-4 weeks)

**Repository:** github.com/facebook/lexical

---

### 3. Tiptap

**Description:** Headless editor framework built on ProseMirror.

**Pros:**
- Excellent documentation
- Custom node definition (word nodes)
- Active community
- Collaborative editing support (future)
- MIT License

**Cons:**
- General-purpose, not transcript-specific
- Extension development needed

**Integration Effort:** High (3-4 weeks)

**Repository:** github.com/ueberdosis/tiptap

---

## Decision Criteria

Evaluate after beta based on:

1. **User Feedback**
   - What features are users requesting?
   - What pain points exist with current editor?
   - How often do users edit transcripts?

2. **Performance Requirements**
   - Typical transcript length (30 min? 2 hours?)
   - Browser performance issues reported?

3. **Feature Requests**
   - Real-time collaboration needed?
   - Rich formatting needed?
   - Annotation complexity?

4. **Development Resources**
   - Available developer time
   - Timeline pressure
   - Maintenance capacity

---

## Recommendation Matrix

| Scenario | Recommended Editor |
|----------|-------------------|
| Users rarely edit, mostly review | Keep current |
| Word-level editing is primary use | pmacom-react-transcript-editor |
| Very long transcripts (2+ hours) | Lexical |
| Future real-time collaboration | Tiptap |

---

## Implementation Phases (If Pursued)

### Phase 10.1: Research (1 week)
- Gather beta user feedback
- Identify top 3 pain points
- Prototype each candidate

### Phase 10.2: Proof of Concept (1 week)
- Build POC with chosen library
- Test with 2-hour transcript
- Validate performance

### Phase 10.3: Implementation (2 weeks)
- Full integration
- Audio synchronization
- Confidence highlighting
- Scopist workflow support

### Phase 10.4: Migration (1 week)
- Feature parity verification
- User acceptance testing
- Documentation update

---

## Resources

- [pmacom-react-transcript-editor](https://github.com/pmacom/react-transcript-editor)
- [Lexical Documentation](https://lexical.dev/)
- [Tiptap Documentation](https://tiptap.dev/)
- [Depo-Pro Current Editor](../components/transcripts/)

---

## Notes

- Do NOT begin this phase until beta feedback is collected
- Current solution is adequate for launch
- Editor choice is product decision, not just technical
