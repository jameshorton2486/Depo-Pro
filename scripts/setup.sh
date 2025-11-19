#!/bin/bash
# Depo-Pro Setup Script (Linux/Mac)
# Run from project root: ./scripts/setup.sh

set -e  # Exit on error

echo "🚀 Setting up Depo-Pro..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  ✅ Node.js: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "  ❌ npm not found"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "  ✅ npm: v$NPM_VERSION"

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "  ⚠️  FFmpeg not found"
    echo "     macOS: brew install ffmpeg"
    echo "     Ubuntu: sudo apt-get install ffmpeg"
    echo "     Audio preprocessing will not work without FFmpeg"
else
    echo "  ✅ FFmpeg: Available"
fi

echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo "   Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and fill in your API keys:"
    echo "   - DATABASE_URL"
    echo "   - REDIS_HOST"
    echo "   - DEEPGRAM_API_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo ""
    echo "Press Enter after updating .env to continue..."
    read
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "  ✅ Dependencies installed"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo "  ✅ Prisma Client generated"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
if ! npx prisma migrate dev --name init; then
    echo "⚠️  Migration failed. Trying deploy instead..."
    if ! npx prisma migrate deploy; then
        echo "❌ Database migration failed"
        echo "   Check your DATABASE_URL in .env"
        exit 1
    fi
fi
echo "  ✅ Database migrations complete"
echo ""

# Seed database
echo "🌱 Seeding database..."
if ! npm run db:seed; then
    echo "⚠️  Database seeding failed (non-critical)"
else
    echo "  ✅ Database seeded with demo data"
fi
echo ""

# Run verification
echo "🔌 Testing connections..."
npm run verify
echo ""

# Success
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. npm run dev        (Start API server)"
echo "2. npm run worker     (Start background worker in new terminal)"
echo ""
echo "Or run both at once with: npm run dev:all"
echo ""
