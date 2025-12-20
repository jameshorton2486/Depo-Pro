# Contributing to Depo-Pro

Thank you for your interest in contributing to Depo-Pro! This document provides guidelines and instructions for contributing.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background or experience level.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept criticism gracefully
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or Supabase account)
- Git installed
- Basic knowledge of TypeScript and React

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/depo-pro.git
   cd depo-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Set up database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

Examples:
- `feature/exhibit-stamping`
- `fix/audio-sync-bug`
- `docs/api-documentation`

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run typecheck  # TypeScript validation
   npm run lint       # Code quality checks
   npm run build      # Build verification
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add exhibit stamping feature"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(transcripts): add low-confidence word filtering
fix(auth): handle JWT decryption errors gracefully
docs(api): update transcription endpoint documentation
```

### Pull Request Process

1. **Update your fork**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Push to your fork**
   ```bash
   git push origin your-branch
   ```

3. **Create Pull Request**
   - Use the PR template
   - Provide clear description
   - Reference related issues
   - Add screenshots for UI changes

4. **Respond to feedback**
   - Address review comments
   - Update code as needed
   - Keep PR updated with main branch

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` types (use `unknown` if needed)
- Define interfaces for complex objects
- Use type guards for runtime checks

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: Role;
}

function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

// ❌ Bad
function processUser(user: any) {
  return user.email;
}
```

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Use TypeScript for props
- Keep components focused and small

```typescript
// ✅ Good
interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
}

export function AudioPlayer({ src, onTimeUpdate }: AudioPlayerProps) {
  // Component logic
}

// ❌ Bad
export function AudioPlayer(props: any) {
  // Component logic
}
```

### File Organization

- One component per file
- Co-locate related files
- Use index files for exports
- Group by feature, not type

```
components/
  transcripts/
    audio-player.tsx
    synced-transcript.tsx
    index.ts
```

### Error Handling

- Always handle errors explicitly
- Use try-catch for async operations
- Provide meaningful error messages
- Log errors appropriately

```typescript
// ✅ Good
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('API call failed', error);
  throw new Error('Failed to fetch data');
}

// ❌ Bad
const result = await apiCall(); // No error handling
```

### Database Queries

- Use Prisma for all database access
- Validate input before queries
- Handle null/undefined cases
- Use transactions for multi-step operations

```typescript
// ✅ Good
const job = await db.job.findUnique({
  where: { id: jobId },
  include: { transcription: true },
});

if (!job) {
  throw new Error('Job not found');
}

// ❌ Bad
const job = await db.job.findUnique({
  where: { id: jobId },
});
job.transcription; // Might be undefined
```

## Testing

### Manual Testing

Before submitting a PR, test:
- [ ] Feature works as expected
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Build succeeds
- [ ] No console errors
- [ ] Responsive design (mobile/desktop)

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

## Documentation

### Code Comments

- Add JSDoc comments for public functions
- Explain "why" not "what"
- Update comments when code changes

```typescript
/**
 * Transcribes audio using Deepgram API with custom keywords.
 * 
 * @param audioUrl - URL of the audio file to transcribe
 * @param keywords - Array of custom terms to improve accuracy
 * @returns Transcription result with word-level timestamps
 * 
 * @throws {Error} If transcription fails or API key is invalid
 */
export async function transcribeAudio(
  audioUrl: string,
  keywords: string[]
): Promise<TranscriptionResult> {
  // Implementation
}
```

### README Updates

- Update README for new features
- Add setup instructions if changed
- Update dependencies list
- Document new environment variables

## Project-Specific Guidelines

### API Routes

- Use Next.js App Router conventions
- Validate input with Zod schemas
- Handle authentication in middleware
- Return consistent error formats

```typescript
// ✅ Good
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const validated = schema.parse(body);
  // Process request
}

// ❌ Bad
export async function POST(request: NextRequest) {
  const body = await request.json();
  // No validation or auth check
}
```

### Component Patterns

- Use server components by default
- Add 'use client' only when needed
- Pass data via props, not context (when possible)
- Use React Server Components for data fetching

## Getting Help

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)

### Questions?

- Open a [GitHub Discussion](https://github.com/jameshorton2486/depo-pro/discussions)
- Check existing issues
- Review the codebase for examples

## Recognition

Contributors will be:
- Listed in project documentation
- Credited in release notes
- Acknowledged in the README (for significant contributions)

Thank you for contributing to Depo-Pro! 🎉

