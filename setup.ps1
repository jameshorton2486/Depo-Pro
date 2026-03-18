# Depo-Pro Setup Script (Windows PowerShell)
# Run from project root: .\scripts\setup.ps1

Write-Host "🚀 Setting up Depo-Pro..." -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found" -ForegroundColor Red
    exit 1
}

# Check FFmpeg
try {
    $ffmpegVersion = ffmpeg -version 2>$null | Select-Object -First 1
    Write-Host "  ✅ FFmpeg: Available" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  FFmpeg not found. Install from https://ffmpeg.org/" -ForegroundColor Yellow
    Write-Host "     Audio preprocessing will not work without FFmpeg" -ForegroundColor Yellow
}

Write-Host ""

# Check .env.local (Next.js loads this first — never overwrite if it exists)
if (-Not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "   Copying .env.example to .env.local..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env.local"
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Edit .env.local and add your real API keys:" -ForegroundColor Yellow
        Write-Host "   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Yellow
        Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
        Write-Host "   - DEEPGRAM_API_KEY" -ForegroundColor Yellow
        Write-Host "   - ANTHROPIC_API_KEY" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Never commit .env.local. Run 'npm run check:apis' to verify keys." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press Enter after updating .env.local to continue..."
        Read-Host
    } else {
        Write-Host "   .env.example not found — create .env.local manually" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ .env.local exists (will not overwrite — contains your keys)" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed. Trying deploy instead..." -ForegroundColor Yellow
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Database migration failed" -ForegroundColor Red
        Write-Host "   Check your DATABASE_URL in .env" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ Database migrations complete" -ForegroundColor Green
Write-Host ""

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Database seeding failed (non-critical)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Database seeded with demo data" -ForegroundColor Green
}
Write-Host ""

# Run verification
Write-Host "🔌 Testing connections..." -ForegroundColor Yellow
npm run verify
Write-Host ""

# Success
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. npm run dev        (Start API server)" -ForegroundColor White
Write-Host "2. npm run worker     (Start background worker in new terminal)" -ForegroundColor White
Write-Host ""
Write-Host "Or run both at once:" -ForegroundColor Cyan
Write-Host "   .\run-all.ps1" -ForegroundColor White
Write-Host ""
