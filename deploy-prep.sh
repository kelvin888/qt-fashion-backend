#!/bin/bash

# Qt Fashion Backend - Railway Deployment Helper Script
# This script helps prepare your backend for Railway deployment

set -e

echo "🚀 Qt Fashion Backend - Railway Deployment Helper"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Git repository not initialized. Initializing...${NC}"
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
else
    echo -e "${GREEN}✓ Git repository found${NC}"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Build TypeScript
echo "Building TypeScript..."
npm run build
echo -e "${GREEN}✓ TypeScript compiled${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
    echo -e "${RED}⚠️  Please update .env with your actual values${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Add all files to git
echo "Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to commit${NC}"
else
    echo "Committing changes..."
    git commit -m "Prepare for Railway deployment - $(date +%Y-%m-%d)"
    echo -e "${GREEN}✓ Changes committed${NC}"
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Backend is ready for Railway deployment!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Set up Supabase:${NC}"
echo "   - Go to https://supabase.com"
echo "   - Create a new project"
echo "   - Get the DATABASE_URL connection string"
echo ""
echo "2. ${YELLOW}Push to GitHub (optional but recommended):${NC}"
echo "   git remote add origin https://github.com/YOUR_USERNAME/qt-fashion-backend.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. ${YELLOW}Deploy to Railway:${NC}"
echo "   - Go to https://railway.app"
echo "   - Create new project from GitHub repo"
echo "   - Set environment variables (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "4. ${YELLOW}Generate JWT Secret:${NC}"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "5. ${YELLOW}Run migrations on Railway:${NC}"
echo "   railway run npx prisma migrate deploy"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
