# Phase 11: Audio Visualization

> **Status:** ARCHIVED — NOT IN MVP  
> **Target:** Post-Beta (Q3 2025)  
> **Estimated Effort:** 2-3 weeks  
> **Risk Level:** Medium (performance-sensitive)

---

## Overview

This phase adds visual waveform display and region highlighting to the transcript review interface. This enhances the scopist workflow by providing visual audio context.

---

## Current Solution

The MVP uses:
- HTML5 `<audio>` element with custom controls
- Play/pause, seek, speed control
- Time display and progress bar
- Keyboard shortcuts

**Status:** Functional for MVP. Users can review audio effectively.

---

## Planned Features

### Waveform Display

Visual representation of audio amplitude over time.

```
┌────────────────────────────────────────────────────────────┐
│   ▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃        │
│ ▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█    │
│   0:00                    1:30                    3:00     │
└────────────────────────────────────────────────────────────┘
```

**Benefits:**
- See silence/speech patterns
- Quick navigation by visual scanning
- Identify overlapping speakers

### Region Highlighting

Visual markers for low-confidence segments.

```
┌────────────────────────────────────────────────────────────┐
│   ▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃        │
│ ▁▃▅▇█▇▅▃▁▃▅▇█▇▅▃▁▃▅[████]▅▃▁▃▅▇█▇▅▃▁[████]▇█▇▅▃▁▃▅▇█    │
│                    ^Low                    ^Low            │
└────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Instantly see where review is needed
- Jump between flagged regions
- Track review progress visually

### Speaker Lanes (Future)

Separate waveforms per speaker.

```
Speaker 0: ▃▅▇█▇▅▃▁▁▁▁▁▁▁▁▁▃▅▇█▇▅▃▁▁▁▁▁▁▁▁▁▃▅▇█▇▅▃
Speaker 1: ▁▁▁▁▁▁▁▃▅▇█▇▅▃▁▁▁▁▁▁▁▃▅▇█▇▅▃▁▁▁▁▁▁▁▃▅▇█
```

---

## Recommended Library

### wavesurfer.js

**Version:** 7.x with @wavesurfer/react wrapper

**Key Features:**
- Waveform rendering
- Regions plugin for highlighting
- Markers plugin for events
- Zoom and scroll
- Multiple backend options

**Critical Setting:** Use `MediaElement` backend for long audio.

```typescript
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F46E5',
  progressColor: '#818CF8',
  
  // CRITICAL: Use MediaElement for long audio
  backend: 'MediaElement',
  
  // Performance settings
  minPxPerSec: 50,
  scrollParent: true,
  
  plugins: [
    RegionsPlugin.create(),
  ],
});
```

---

## Performance Considerations

### Memory Management

Long depositions (2+ hours) can crash browsers if the entire waveform is decoded.

**Solutions:**
1. **MediaElement backend:** Stream audio instead of decoding to buffer
2. **Lazy rendering:** Only render visible portion
3. **Reduced resolution:** Lower waveform sample rate for long files

### Rendering Optimization

```typescript
// Efficient region creation
function createFlaggedRegions(
  wavesurfer: WaveSurfer,
  flaggedWords: WordMetadata[]
) {
  const regions = wavesurfer.plugins.regions;
  
  // Batch region creation
  const regionData = flaggedWords.map(word => ({
    start: word.start,
    end: word.end,
    color: 'rgba(249, 115, 22, 0.3)', // orange with opacity
    drag: false,
    resize: false,
  }));
  
  // Add all at once
  regionData.forEach(r => regions.addRegion(r));
}
```

### Mobile Compatibility

- Waveform may be too small on mobile
- Consider simplified view for small screens
- Test touch interactions

---

## Implementation Phases (If Pursued)

### Phase 11.1: Basic Waveform (1 week)
- Integrate wavesurfer.js
- MediaElement backend setup
- Basic play/pause/seek sync

### Phase 11.2: Region Highlighting (1 week)
- Create regions for low-confidence words
- Click region to seek
- Region color by confidence level

### Phase 11.3: Performance Tuning (0.5 week)
- Test with 2-hour audio
- Memory profiling
- Mobile testing

### Phase 11.4: Integration (0.5 week)
- Replace current audio player
- Sync with transcript highlight
- Documentation

---

## Decision Criteria

Implement when:

1. **User Demand:** Multiple users request visual waveform
2. **Long Audio:** Users regularly work with 1+ hour depositions
3. **Navigation Issues:** Users struggle to find specific sections
4. **Resources Available:** Developer time for 2-3 week project

---

## Resources

- [wavesurfer.js Documentation](https://wavesurfer-js.org/)
- [@wavesurfer/react](https://github.com/katspaugh/wavesurfer-react)
- [Regions Plugin](https://wavesurfer-js.org/plugins/regions.html)
- [Performance Guide](https://wavesurfer-js.org/faq/)

---

## Notes

- Current HTML5 player is sufficient for MVP
- Waveform adds complexity and potential performance issues
- Prioritize based on actual user feedback
- Consider A/B testing with select users first
