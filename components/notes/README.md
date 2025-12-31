# Deposition Notes Components

Live Notes UI for Depo-Pro Phase 6C.

## Components

### `DepositionNotesPanel`
Full-featured notes panel for reporters and admins.

**Features:**
- Create, edit, delete notes (reporter only)
- Optional category tagging
- Optional audio timestamp capture
- Click timestamp to seek audio player
- Lock indicator for finalized jobs
- Inline editing
- Auto-save indicators

**Props:**
```typescript
interface DepositionNotesPanelProps {
  jobId: string;
  userRole: 'REPORTER' | 'SCOPIST' | 'ADMIN';
  userId: string;
  currentAudioTime?: number; // Current playback position in seconds
  onSeekAudio?: (timestamp: number) => void; // Callback to seek audio
  className?: string;
}
```

### `ScopistNotesView`
Read-only notes view for scopists.

**Features:**
- View all reporter notes (after deposition)
- Read-only (no edit/delete)
- Click timestamp to seek audio
- Category badges
- Reporter attribution

**Props:**
```typescript
interface ScopistNotesViewProps {
  jobId: string;
  onSeekAudio?: (timestamp: number) => void;
  className?: string;
}
```

## Integration Example

```tsx
import { DepositionNotesPanel } from '@/components/notes/deposition-notes-panel';
import { ScopistNotesView } from '@/components/notes/scopist-notes-view';

// In your job detail page component:
function JobDetailPage({ job, session }) {
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSeekAudio = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
  };

  // Track audio playback time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentAudioTime(audio.currentTime);
    audio.addEventListener('timeupdate', updateTime);
    return () => audio.removeEventListener('timeupdate', updateTime);
  }, []);

  return (
    <div>
      {/* Audio player */}
      <audio
        ref={audioRef}
        src={job.audioUrl}
        controls
      />

      {/* Notes panel based on role */}
      {session.user.role === 'REPORTER' || session.user.role === 'ADMIN' ? (
        <DepositionNotesPanel
          jobId={job.id}
          userRole={session.user.role}
          userId={session.user.id}
          currentAudioTime={currentAudioTime}
          onSeekAudio={handleSeekAudio}
          className="h-[500px]"
        />
      ) : session.user.role === 'SCOPIST' ? (
        <ScopistNotesView
          jobId={job.id}
          onSeekAudio={handleSeekAudio}
          className="h-[400px]"
        />
      ) : null}
    </div>
  );
}
```

## API Endpoints

All components use:
- `GET /api/jobs/[id]/notes` - List notes
- `POST /api/jobs/[id]/notes` - Create note
- `PATCH /api/jobs/[id]/notes/[noteId]` - Update note
- `DELETE /api/jobs/[id]/notes/[noteId]` - Delete note

## Permissions

**Reporter:**
- ✅ Create notes
- ✅ Edit own notes (until finalized)
- ✅ Delete own notes (until finalized)
- ✅ View all notes for their jobs

**Scopist:**
- ✅ View notes (after deposition, if assigned)
- ❌ Create/edit/delete notes

**Attorney:**
- ❌ Cannot access notes (blocked at API level)

**Admin:**
- ✅ All reporter permissions
- ✅ Can edit/delete any note
