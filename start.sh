#!/bin/bash
set -e

echo "🚀 Replybase Quick Start"
echo "======================="

# Step 1: Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Step 2: Start Docker services
echo ""
echo "🐳 Starting Docker services (PostgreSQL + Redis)..."
docker-compose up -d
echo "   ✓ PostgreSQL running on localhost:5432"
echo "   ✓ Redis running on localhost:6379"

# Step 3: Generate .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Reminder: Fill in required environment variables in .env"
fi

# Step 4: Initialize database
echo ""
echo "🗄️  Initializing database..."
pnpm db:push

# Step 5: Start dev servers
echo ""
echo "✨ All set! Starting development servers..."
echo ""
echo "🌐 Services:"
echo "   • API:       http://localhost:4000"
echo "   • Dashboard: http://localhost:3000"
echo "   • Widget:    http://localhost:5173"
echo ""
echo "📖 Check README.md for more details"
echo ""

pnpm dev
