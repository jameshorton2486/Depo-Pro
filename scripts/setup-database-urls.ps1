# scripts/setup-database-urls.ps1
# Helper script to set up Supabase database URLs for Prisma migrations
#
# Supabase requires TWO different connection strings:
# 1. DATABASE_URL - Pooled connection (for runtime/app) - uses pgbouncer
# 2. DIRECT_URL - Direct connection (for migrations) - required for DDL operations

Write-Host "🔧 Supabase Database URL Setup" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local not found. Creating from .env.example..." -ForegroundColor Red
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "✅ Created .env.local from .env.example" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example also not found. Please create .env.local manually." -ForegroundColor Red
        exit 1
    }
}

# Read current .env.local
$envContent = Get-Content ".env.local" -Raw

# Check if DATABASE_URL exists
if ($envContent -notmatch "DATABASE_URL=") {
    Write-Host "❌ DATABASE_URL not found in .env.local" -ForegroundColor Red
    Write-Host "   Please add your Supabase pooled connection string first." -ForegroundColor Yellow
    exit 1
}

# Extract current DATABASE_URL
$databaseUrlMatch = [regex]::Match($envContent, 'DATABASE_URL="?([^"\r\n]+)"?')
if (-not $databaseUrlMatch.Success) {
    Write-Host "❌ Could not parse DATABASE_URL from .env.local" -ForegroundColor Red
    exit 1
}

$currentUrl = $databaseUrlMatch.Groups[1].Value
Write-Host "📋 Current DATABASE_URL:" -ForegroundColor Cyan
Write-Host "   $currentUrl" -ForegroundColor Gray
Write-Host ""

# Check if it's a pooled URL
if ($currentUrl -match "pooler\.supabase\.com|pgbouncer") {
    Write-Host "✅ Detected pooled connection (correct for runtime)" -ForegroundColor Green
    Write-Host ""
    
    # Extract project reference from pooled URL
    if ($currentUrl -match "postgres\.([^.]+)\.supabase\.com") {
        $projectRef = $matches[1]
        Write-Host "🔍 Detected project reference: $projectRef" -ForegroundColor Cyan
        Write-Host ""
        
        # Check if DIRECT_URL already exists
        if ($envContent -match "DIRECT_URL=") {
            Write-Host "✅ DIRECT_URL already exists in .env.local" -ForegroundColor Green
            $directUrlMatch = [regex]::Match($envContent, 'DIRECT_URL="?([^"\r\n]+)"?')
            if ($directUrlMatch.Success) {
                Write-Host "   Current: $($directUrlMatch.Groups[1].Value)" -ForegroundColor Gray
            }
        } else {
            Write-Host "⚠️  DIRECT_URL not found. You need to add it for migrations." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "📝 Add this to your .env.local:" -ForegroundColor Cyan
            Write-Host ""
            
            # Extract password from current URL
            if ($currentUrl -match "postgresql://([^:]+):([^@]+)@") {
                $username = $matches[1]
                $password = $matches[2]
                
                $directUrl = "postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require"
                
                Write-Host "DIRECT_URL=`"$directUrl`"" -ForegroundColor White
                Write-Host ""
                Write-Host "💡 This uses the direct connection (db.*.supabase.co) required for migrations" -ForegroundColor Gray
                Write-Host ""
                
                # Ask if user wants to add it automatically
                $response = Read-Host "Add DIRECT_URL to .env.local automatically? (y/n)"
                if ($response -eq "y" -or $response -eq "Y") {
                    $newLine = "`n# Direct connection for Prisma migrations (required for DDL operations)`nDIRECT_URL=`"$directUrl`""
                    Add-Content ".env.local" $newLine
                    Write-Host "✅ Added DIRECT_URL to .env.local" -ForegroundColor Green
                }
            } else {
                Write-Host "❌ Could not parse credentials from DATABASE_URL" -ForegroundColor Red
                Write-Host "   Please manually add DIRECT_URL using the format above" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠️  Could not detect project reference from DATABASE_URL" -ForegroundColor Yellow
        Write-Host "   Please manually add DIRECT_URL:" -ForegroundColor Yellow
        Write-Host "   DIRECT_URL=`"postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres`"" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  DATABASE_URL doesn't appear to be a Supabase pooled connection" -ForegroundColor Yellow
    Write-Host "   If you're using Supabase, ensure it uses pooler.supabase.com" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📚 How to find your Supabase connection strings:" -ForegroundColor Cyan
Write-Host "   1. Go to Supabase Dashboard → Project Settings → Database" -ForegroundColor White
Write-Host "   2. Connection string → Connection pooling: Use for DATABASE_URL" -ForegroundColor White
Write-Host "   3. Connection string → Direct connection: Use for DIRECT_URL" -ForegroundColor White
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
