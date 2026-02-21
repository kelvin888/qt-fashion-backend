#!/bin/bash

# QT Fashion Admin User Creation Script
# Usage: ./scripts/create-admin.sh [environment]
# Environment: local (default) or production

set -e

echo "🔐 QT Fashion Admin User Creation"
echo "=================================="
echo ""

# Determine environment
ENV=${1:-local}

if [ "$ENV" = "production" ]; then
  echo "⚠️  PRODUCTION MODE"
  echo "Ensure you have the production ADMIN_CREATION_SECRET"
  read -p "Production API URL: " API_URL
else
  echo "📍 LOCAL DEVELOPMENT MODE"
  API_URL="http://localhost:5000"
fi

# Load environment variables if local
if [ "$ENV" = "local" ] && [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validate secret key exists
if [ -z "$ADMIN_CREATION_SECRET" ]; then
  echo ""
  echo "❌ Error: ADMIN_CREATION_SECRET not found"
  echo ""
  echo "Please set it in your .env file (local) or provide it below (production):"
  read -s -p "ADMIN_CREATION_SECRET: " ADMIN_CREATION_SECRET
  echo ""
fi

echo ""
echo "📝 Enter Admin Details"
echo "─────────────────────"

# Collect admin information
read -p "Admin Email: " ADMIN_EMAIL
read -s -p "Admin Password (min 12 chars, mixed case, numbers, special chars): " ADMIN_PASSWORD
echo ""
read -p "Admin Full Name: " ADMIN_FULLNAME

echo ""
echo "📡 Creating admin user..."
echo ""

# Make API request
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/create-admin" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"fullName\": \"$ADMIN_FULLNAME\",
    \"secretKey\": \"$ADMIN_CREATION_SECRET\"
  }")

# Extract HTTP status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Check response
if [ "$http_code" -eq 201 ]; then
  echo "✅ Admin user created successfully!"
  echo ""
  echo "📧 Email: $ADMIN_EMAIL"
  echo "👤 Name: $ADMIN_FULLNAME"
  echo ""
  echo "⚠️  CRITICAL SECURITY STEPS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. 🔒 Remove ADMIN_CREATION_SECRET from environment variables NOW"
  echo "2. 🔑 Login and change your password immediately"
  echo "3. 📝 Save these credentials in a secure password manager"
  echo "4. 🗑️  Secure or delete this script with proper permissions"
  echo ""
  
  if [ "$ENV" = "production" ]; then
    echo "🚀 Production Checklist:"
    echo "   □ Remove ADMIN_CREATION_SECRET from Railway/hosting platform"
    echo "   □ Restart backend service"
    echo "   □ Verify endpoint is disabled via /api/auth/admin-status"
    echo "   □ Test admin login on production dashboard"
  fi
  
  echo ""
  echo "Login URL:"
  if [ "$ENV" = "production" ]; then
    echo "https://qt-fashion-admin.vercel.app/login"
  else
    echo "http://localhost:3000/login"
  fi
else
  echo "❌ Failed to create admin user (HTTP $http_code)"
  echo ""
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  echo "Common Issues:"
  echo "- Invalid ADMIN_CREATION_SECRET"
  echo "- Password doesn't meet requirements"
  echo "- Admin user already exists"
  echo "- Backend server not running"
  echo ""
  echo "Password Requirements:"
  echo "  • Minimum 12 characters"
  echo "  • At least one uppercase letter"
  echo "  • At least one lowercase letter"
  echo "  • At least one number"
  echo "  • At least one special character (!@#$%^&*(),.?\":{}|<>)"
fi
