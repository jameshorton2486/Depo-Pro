# DEPO-PRO: Package Installation Scripts

**From your Open Source Strategy document**

---

## MVP Installation (Run This First)

### PowerShell (Windows):
```powershell
# Navigate to your project
cd depo-pro

# Install MVP packages (from your Open Source Strategy)
npm install @deepgram/sdk react-h5-audio-player react-highlight-words docx react-hook-form zod sonner date-fns react-dropzone

# Verify installation
npm list @deepgram/sdk
```

### Bash (Mac/Linux):
```bash
# Navigate to your project
cd depo-pro

# Install MVP packages
npm install @deepgram/sdk react-h5-audio-player react-highlight-words docx react-hook-form zod sonner date-fns react-dropzone

# Verify installation
npm list @deepgram/sdk
```

---

## Phase 2 Installation (After MVP)

```bash
npm install wavesurfer.js @tiptap/react @tiptap/starter-kit pdf-lib inngest @stripe/stripe-js
```

---

## What Each Package Does

| Package | Purpose | License | Already Installed? |
|---------|---------|---------|-------------------|
| @deepgram/sdk | AI transcription API | MIT | ✅ Yes |
| react-h5-audio-player | Simple audio player | MIT | ❌ Install |
| react-highlight-words | Highlight current word | MIT | ❌ Install |
| docx | DOCX generation | MIT | ✅ Yes |
| react-hook-form | Form handling | MIT | ✅ Yes |
| zod | Schema validation | MIT | ✅ Yes |
| sonner | Toast notifications | MIT | ✅ Yes |
| date-fns | Date utilities | MIT | ❌ Install |
| react-dropzone | File upload drag-drop | MIT | ❌ Install |

---

## Packages to NEVER Install (License Issues)

From your Open Source Strategy:
- ❌ peaks.js (LGPL - reference only)
- ❌ Any GPL/AGPL package
- ❌ Etherpad (reference architecture only)

---

## Verify Everything Works

```bash
# Check for TypeScript errors
npm run typecheck

# Try to build
npm run build

# Start dev server
npm run dev
```

---

## Environment Variables Required

Create `.env.local` with:

```env
# Deepgram (get from console.deepgram.com)
DEEPGRAM_API_KEY=your_api_key_here
USE_DEEPGRAM=true

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Generate NEXTAUTH_SECRET:
```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Bash/Mac
openssl rand -base64 32
```

---

## Quick Start Sequence

1. **Install packages:**
   ```bash
   npm install
   npm install react-h5-audio-player react-highlight-words date-fns react-dropzone
   ```

2. **Set up environment:**
   - Copy `.env.example` to `.env.local`
   - Add your Deepgram API key
   - Add your Supabase credentials

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   - http://localhost:3000
