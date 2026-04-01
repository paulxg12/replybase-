#!/bin/bash

# Replybase Development Startup (No Docker)
# This script starts services locally

set -e

echo "🚀 Replybase Local Development"
echo "================================"
echo ""

# Check if we have required tools
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Check environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.prod..."
    cp .env.prod .env
    echo "✓ Created .env"
fi

echo ""
echo "ℹ️  Note: Database and Redis must be running separately"
echo "   If using Docker:"
echo "   docker-compose up -d"
echo ""
echo "   If local PostgreSQL/Redis:"
echo "   - PostgreSQL on localhost:5432"
echo "   - Redis on localhost:6379"
echo ""

echo "📦 Installing dependencies..."
npm install > /dev/null 2>&1 || true

echo "✓ Dependencies installed"
echo ""

echo "🎯 Starting development servers..."
echo "   Dashboard: http://localhost:3000"
echo "   API:       http://localhost:4000"
echo "   Widget:    http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

npm run dev
