#!/bin/bash

# Replybase Production Deployment Script
# This script automates the deployment process using Docker Compose

set -e

echo "🚀 Replybase Production Deployment"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://docker.com"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"
echo ""

# Check environment file
if [ ! -f .env.prod ]; then
    echo -e "${YELLOW}⚠️  .env.prod not found${NC}"
    echo "Creating from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env.prod
        echo -e "${GREEN}✓ Created .env.prod${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.prod with production values${NC}"
        echo "Run: nano .env.prod"
        echo ""
        exit 1
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Found .env.prod${NC}"
echo ""

# Confirm deployment
read -p "⚠️  This will start Replybase in production mode. Continue? (yes/no) " -n 3 -r
echo ""

if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Starting deployment..."
echo ""

# Step 1: Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker images${NC}"
    exit 1
fi

echo ""

# Step 2: Start services
echo "🐳 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services started${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    echo "Run: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo ""

# Step 3: Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}✓ Services are healthy${NC}"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "  Attempt $retry_count/$max_retries..."
    sleep 2
done

if [ $retry_count -ge $max_retries ]; then
    echo -e "${YELLOW}⚠️  Services may not be fully healthy yet${NC}"
    echo "Run: docker-compose -f docker-compose.prod.yml logs"
fi

echo ""

# Step 4: Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${RED}❌ Database migrations failed${NC}"
    echo "Check logs: docker-compose -f docker-compose.prod.yml logs api"
    exit 1
fi

echo ""

# Step 5: Verify services
echo "✅ Verifying services..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 Replybase is now running in production!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Get service URLs from .env.prod
APP_URL=$(grep ^APP_URL= .env.prod | cut -d '=' -f 2)
API_URL=$(grep ^API_URL= .env.prod | cut -d '=' -f 2)
WIDGET_URL=$(grep ^WIDGET_URL= .env.prod | cut -d '=' -f 2)

echo "📍 Service URLs:"
echo "   Dashboard: ${APP_URL:-http://localhost:3000}"
echo "   API:       ${API_URL:-http://localhost:4000}"
echo "   Widget:    ${WIDGET_URL:-http://localhost:5173}"
echo ""

echo "📚 Useful Commands:"
echo "   View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker-compose -f docker-compose.prod.yml down"
echo "   Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "   DB backup:    docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U user replybase > backup.sql"
echo ""

echo "📖 For more information, see DEPLOYMENT.md"
echo ""
