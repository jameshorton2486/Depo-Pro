# Depo-Pro — Dev CLI Reference

## Local Development

```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # ESLint check
npx tsc --noEmit         # Type check
```

## Vercel

```bash
vercel whoami            # Check auth status
vercel link              # Link project
vercel env pull          # Pull env vars to .env.local
vercel dev               # Run local dev with Vercel runtime
vercel --prod            # Deploy to production
vercel logs              # View deployment logs
```

## Supabase

```bash
supabase login           # Authenticate
supabase link --project-ref ildhcfspbmhuemzgvzyx  # Link to depo-pro
supabase projects list   # List projects
supabase status          # Local instance status
supabase db diff         # Show schema diff
supabase db push         # Push migrations to remote
supabase migration list  # List migrations
supabase inspect db locks        # Check active locks
supabase inspect db long-running-queries  # Find slow queries
```

## GitHub CLI

```bash
gh auth status           # Check auth
gh repo view             # View repo info
gh pr list               # List pull requests
gh pr create             # Create PR
gh run list              # List workflow runs
gh run view <ID>         # View workflow run details
gh issue list            # List issues
```

## Stripe CLI

```bash
stripe login             # Authenticate
stripe listen --forward-to localhost:3000/api/webhooks/stripe  # Forward webhooks
stripe trigger payment_intent.succeeded  # Test webhook events
stripe customers list    # List customers
stripe logs tail         # Tail API logs
```

## Prisma

```bash
prisma generate          # Generate client from schema
prisma db pull           # Introspect database
prisma studio            # Open visual editor
prisma format            # Format schema file
```

## Resend (SDK — no CLI)

Resend is used via the Node.js SDK (`resend` package). No CLI is available.
Test emails via the Resend dashboard or API calls in code.

## Verification

```powershell
.\scripts\verify-cli.ps1   # Check all CLI tools are installed
```
