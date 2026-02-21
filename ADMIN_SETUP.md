# QT Fashion Admin Setup Guide

Complete guide for creating and managing admin users in the QT Fashion platform.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Password Requirements](#password-requirements)
- [Setup Methods](#setup-methods)
- [Security Steps](#security-steps)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Emergency Access](#emergency-access)

## Quick Start

### Local Development

```bash
# 1. Start backend
npm run dev

# 2. In another terminal, create admin
npm run create-admin
```

### Production (Railway/Vercel)

```bash
npm run create-admin:prod
```

## Prerequisites

1. **Backend must be running**
   - Local: `npm run dev` (http://localhost:5000)
   - Production: Deployed on Railway or hosting platform

2. **Environment variable configured**

   Add to `.env` (local) or environment settings (production):

   ```env
   ADMIN_CREATION_SECRET=your-super-secure-random-secret
   ```

3. **Generate secure secret** (recommended):

   ```bash
   # macOS/Linux
   openssl rand -base64 32

   # Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## Password Requirements

Your admin password **MUST** include:

- ✅ Minimum 12 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&\*(),.?":{}|<>)

**Examples of STRONG passwords:**

- `Admin@QT2026!Secure`
- `F@shion#Plat2026`
- `Secure!Admin$2026`

**Examples of WEAK passwords (DO NOT USE):**

- `admin123` (too short, no special chars)
- `AdminPassword` (no numbers or special chars)
- `12345678` (no letters)

## Setup Methods

### Method 1: Using Script (Recommended)

**Local Development:**

```bash
npm run create-admin
```

**Production:**

```bash
npm run create-admin:prod
```

The script will:

1. Prompt you for admin email, password, and full name
2. Validate all inputs
3. Create the admin user
4. Display security checklist
5. Provide login URL

### Method 2: Using cURL

**Local:**

```bash
curl -X POST http://localhost:5000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@qtfashion.com",
    "password": "SecureAdmin@2026!",
    "fullName": "System Administrator",
    "secretKey": "your-secret-from-env"
  }'
```

**Production (Railway):**

```bash
curl -X POST https://qt-fashion-backend-production.up.railway.app/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@qtfashion.com",
    "password": "SecureAdmin@2026!",
    "fullName": "System Administrator",
    "secretKey": "your-production-secret"
  }'
```

### Method 3: Using Postman/Insomnia/Thunder Client

1. **Create POST request** to `/api/auth/create-admin`

2. **Set request body** (JSON):

   ```json
   {
     "email": "admin@qtfashion.com",
     "password": "SecureAdmin@2026!",
     "fullName": "System Administrator",
     "secretKey": "your-secret-key-here"
   }
   ```

3. **Send request**

4. **Save the token** from the response for immediate login

## Security Steps

### Immediate Actions (Within 5 Minutes)

After creating your admin user, complete these steps **immediately**:

#### 1. Remove Secret from Environment

**Local Development:**

```bash
# Edit .env file and remove or comment out:
# ADMIN_CREATION_SECRET=...
```

**Railway:**

1. Go to Railway dashboard → Your project
2. Navigate to "Variables" tab
3. Delete `ADMIN_CREATION_SECRET`
4. Redeploy service

**Vercel/Other Platforms:**

1. Go to environment settings
2. Remove `ADMIN_CREATION_SECRET`
3. Redeploy

#### 2. Restart Backend Service

This ensures the environment change takes effect:

```bash
# Local
# Stop (Ctrl+C) and restart
npm run dev

# Railway
# Automatic on variable change, or use:
# railway up --detach

# Or restart through dashboard
```

#### 3. Login to Admin Dashboard

```bash
# Local
open http://localhost:3000/login

# Production
open https://qt-fashion-admin.vercel.app/login
```

Use the credentials you just created.

#### 4. Verify Endpoint is Disabled

After removing the secret, verify via status endpoint:

```bash
# Get your admin token first (from login response)
TOKEN="your-jwt-token-here"

# Check status
curl http://localhost:5000/api/auth/admin-status \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "isEnabled": false,
    "adminCount": 1,
    "recommendation": "✅ Admin creation endpoint is properly disabled. System is secure.",
    "securityLevel": "SECURE"
  }
}
```

### Within 24 Hours

- [ ] **Change password** if you used a temporary/weak one
- [ ] **Set up password manager** (1Password, LastPass, Bitwarden)
- [ ] **Document credentials** securely
- [ ] **Review audit logs** for unauthorized attempts
- [ ] **Enable 2FA** (when feature becomes available)
- [ ] **Test all admin features** to ensure proper access

## Production Deployment

### Step-by-Step Production Setup

#### 1. Configure Environment (Railway)

1. Go to Railway dashboard
2. Select your backend project
3. Navigate to "Variables" tab
4. Click "New Variable"
5. Add:
   ```
   ADMIN_CREATION_SECRET=<paste-generated-secure-secret>
   ```
6. Click "Deploy" (or it auto-deploys)
7. Wait for deployment to complete

#### 2. Create Admin User

```bash
# Option A: Using script
npm run create-admin:prod

# Option B: Using cURL
curl -X POST https://your-backend.railway.app/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@qtfashion.com",
    "password": "YourSecurePassword123!@#",
    "fullName": "QT Fashion Admin",
    "secretKey": "your-railway-secret-here"
  }'
```

#### 3. Secure Environment

1. **Remove secret** from Railway:
   - Navigate to Variables tab
   - Delete `ADMIN_CREATION_SECRET`
   - Service will auto-redeploy

2. **Verify removal**:

   ```bash
   curl https://your-backend.railway.app/api/auth/admin-status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Test admin login** on production dashboard:
   ```
   https://qt-fashion-admin.vercel.app/login
   ```

## Troubleshooting

### "Invalid secret key"

**Cause:** Mismatch between request `secretKey` and environment variable.

**Solutions:**

- Verify `.env` file has correct value (check for typos)
- Ensure no trailing spaces or hidden characters
- Restart backend after adding/changing environment variable
- For production, verify variable is set in hosting dashboard

### "Password must be at least 12 characters long"

**Cause:** Password doesn't meet minimum requirements.

**Solution:** Use a password with:

- 12+ characters
- Mixed case letters (A-z)
- Numbers (0-9)
- Special characters (!@#$%^&\*)

Example: `SecureAdmin@2026!`

### "Admin user already exists"

**Cause:** An admin user has already been created.

**Solutions:**

**Option 1:** Use existing credentials

- If you forgot password, use Option 2

**Option 2:** Promote existing user via database

```sql
UPDATE users
SET role = 'ADMIN', is_verified = true
WHERE email = 'your-existing-email@example.com';
```

**Option 3:** Contact database administrator

### "Admin creation endpoint not properly configured"

**Cause:** `ADMIN_CREATION_SECRET` not set in environment.

**Solution:**

1. Add to `.env`:

   ```env
   ADMIN_CREATION_SECRET=your-secret-here
   ```

2. Restart backend:
   ```bash
   npm run dev
   ```

### "Backend not responding" / Connection refused

**Cause:** Backend service not running.

**Solutions:**

```bash
# Check if backend is running
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Start backend if not running
npm run dev

# Or check logs
npm run logs  # If configured
```

### "Failed to fetch" / CORS Error

**Cause:** CORS not properly configured for admin dashboard.

**Solution:**

Ensure `.env` includes admin dashboard URLs in `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://qt-fashion-admin.vercel.app
```

## Emergency Admin Access

If you lose access to your admin account:

### Option 1: Database Promotion (Recommended)

```sql
-- Connect to PostgreSQL database
-- Railway: Use database connection string from dashboard

UPDATE users
SET role = 'ADMIN', is_verified = true
WHERE email = 'your-existing-user-email@example.com';
```

**Steps:**

1. Connect to database using Prisma Studio or psql
2. Find your existing user account
3. Update role to 'ADMIN'
4. Login with your existing credentials

**Using Prisma Studio:**

```bash
cd qt-fashion-backend
npx prisma studio
```

Then navigate to Users table and edit the role field.

### Option 2: Re-enable Endpoint (NOT Recommended)

⚠️ **Only use this as a last resort:**

1. Add `ADMIN_CREATION_SECRET` back to environment
2. Restart backend
3. Create new admin (will fail if one exists)
4. **Immediately remove secret again**

### Option 3: Password Reset (Future Feature)

This feature is planned for a future update.

## API Response Examples

### Success (201 Created)

```json
{
  "success": true,
  "message": "Admin user created successfully. Please remove ADMIN_CREATION_SECRET from environment variables.",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "admin@qtfashion.com",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "createdAt": "2026-02-21T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

### Error: Invalid Secret (403 Forbidden)

```json
{
  "success": false,
  "message": "Invalid secret key"
}
```

### Error: Weak Password (400 Bad Request)

```json
{
  "success": false,
  "message": "Password must contain uppercase, lowercase, number, and special character"
}
```

### Error: Admin Exists (409 Conflict)

```json
{
  "success": false,
  "message": "Admin user already exists. Please contact support if you need to create additional admins."
}
```

### Error: Missing Fields (400 Bad Request)

```json
{
  "success": false,
  "message": "Email, password, and full name are required"
}
```

## Security Best Practices

### DO ✅

- **Generate random secrets** using `openssl rand -base64 32`
- **Remove secret immediately** after admin creation
- **Use strong, unique passwords** (12+ chars, mixed)
- **Store credentials** in password manager
- **Enable audit logging** (already enabled)
- **Limit admin users** to essential personnel only
- **Regularly rotate** admin passwords
- **Monitor** admin activity logs
- **Use HTTPS** in production
- **Enable 2FA** when available

### DON'T ❌

- ❌ Use weak/predictable secrets (e.g., "admin123", "secret")
- ❌ Leave `ADMIN_CREATION_SECRET` in environment after setup
- ❌ Share admin credentials via unsecured channels (email, Slack)
- ❌ Create multiple admin users unnecessarily
- ❌ Use same password across environments
- ❌ Expose admin credentials in code/logs/screenshots
- ❌ Skip password changes after initial login
- ❌ Store credentials in plain text files
- ❌ Use admin account for testing (create separate test accounts)

## Features After Admin Creation

Once you're logged in as admin, you can:

### Dashboard

- View total revenue from platform fees
- See order statistics
- Monitor average fee percentage
- Check designer distribution by tier

### Platform Settings

- Configure default platform fee percentage
- View audit trail of all changes
- Manage global settings

### Fee Tier Management

- Create/edit/delete fee tiers
- Set order range requirements
- Reward designers based on experience

### Designer Overrides

- Set custom fees for specific designers
- Add reasons/notes for overrides
- Highest priority in fee calculation

### Promotional Campaigns

- Create time-based fee reductions
- Auto-activation by date range
- Support marketing campaigns

### Audit Logs

- Complete history of all changes
- Track which admin made changes
- Before/after value comparison

## Support & Contact

For additional help:

1. **Check this documentation** for common issues
2. **Review error messages** carefully (they're descriptive)
3. **Test with Postman/cURL** to isolate client vs server issues
4. **Check backend logs** for detailed error information
5. **Contact platform administrator** if persistent issues occur

## Appendix

### Generating Secure Secrets

**Using OpenSSL (macOS/Linux):**

```bash
openssl rand -base64 32
```

**Using Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Using Python:**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Environment Variable Locations

**Local Development:**

- File: `qt-fashion-backend/.env`
- Not committed to git (in `.gitignore`)

**Railway:**

- Dashboard → Project → Variables tab
- Automatically encrypted at rest

**Vercel:**

- Dashboard → Project → Settings → Environment Variables
- Separate variables for Production/Preview/Development

### Useful Commands

```bash
# Check if backend is running
lsof -i :5000

# View backend logs (if configured)
npm run logs

# Generate secure random string
openssl rand -base64 32

# Test API endpoint
curl http://localhost:5000/api/auth/admin-status

# Connect to database
npx prisma studio

# Check environment variables
printenv | grep ADMIN
```

---

**Last Updated:** February 21, 2026  
**Version:** 1.0  
**Maintainer:** QT Fashion Engineering Team
