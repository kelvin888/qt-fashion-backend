# Qt Fashion Backend - Railway + Supabase Deployment Guide

This guide will help you deploy the Qt Fashion backend API to Railway with Supabase as the database.

## Prerequisites

- [ ] Railway account (sign up at https://railway.app)
- [ ] Supabase account (sign up at https://supabase.com)
- [ ] Git repository initialized
- [ ] GitHub account (optional but recommended)

## Part 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `qt-fashion-db`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for testing
4. Click "Create new project" and wait for it to initialize (~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** > **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you set earlier
6. **Save this connection string** - you'll need it for Railway

### 1.3 Enable Required Extensions (Optional)

In Supabase Dashboard:
1. Go to **Database** > **Extensions**
2. Search and enable:
   - `uuid-ossp` (for UUID generation)
   - `pg_trgm` (for text search, if needed later)

## Part 2: Deploy to Railway

### 2.1 Prepare Your Code

First, make sure your code is in a Git repository:

```bash
cd /Users/kelvinorhungul/Desktop/clients/SWITCH/qt-fashion/qt-fashion-backend

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"
```

### 2.2 Push to GitHub (Recommended)

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/qt-fashion-backend.git
git branch -M main
git push -u origin main
```

### 2.3 Deploy on Railway

#### Option A: Deploy from GitHub (Recommended)

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your `qt-fashion-backend` repository
5. Railway will automatically detect Node.js and start building

#### Option B: Deploy using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 2.4 Configure Environment Variables

1. In Railway dashboard, go to your project
2. Click on the service
3. Go to **Variables** tab
4. Add these variables:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=<paste-your-supabase-connection-string>
JWT_SECRET=<generate-a-random-32-character-string>
ALLOWED_ORIGINS=*
```

**To generate a JWT secret:**
```bash
# Run this in your terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.5 Run Database Migration

After deployment, you need to set up the database schema:

#### Using Railway CLI:
```bash
railway run npx prisma migrate deploy
```

#### Or in Railway Dashboard:
1. Go to your service
2. Click **Settings**
3. Scroll to **Deploy Triggers**
4. Add a custom start command:
   ```
   npx prisma migrate deploy && npm start
   ```

## Part 3: Verify Deployment

### 3.1 Get Your Railway URL

1. In Railway dashboard, find your service
2. Click on **Settings** tab
3. Scroll to **Domains**
4. Click **Generate Domain**
5. Copy the generated URL (e.g., `https://qt-fashion-backend-production.up.railway.app`)

### 3.2 Test the API

```bash
# Health check
curl https://YOUR-RAILWAY-URL.railway.app/health

# Should return:
# {"status":"ok","message":"QT Fashion API is running"}
```

## Part 4: Update Mobile App

Now update your mobile app to use the deployed API:

1. Edit `qt-fashion-mobile/src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://YOUR-RAILWAY-URL.railway.app/api';
```

2. Rebuild the mobile app:

```bash
cd qt-fashion-mobile/android
./gradlew clean
./gradlew assembleRelease
```

3. Install the new APK on your phone

## Part 5: Update CORS Settings

Once you have your Railway URL, update the CORS settings:

1. In Railway dashboard, go to **Variables**
2. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://YOUR-RAILWAY-URL.railway.app,*
   ```

## Monitoring and Logs

### View Logs
1. In Railway dashboard, click your service
2. Go to **Deployments** tab
3. Click on the latest deployment
4. View real-time logs

### Database Management
1. Go to Supabase dashboard
2. Click **Table Editor** to view/edit data
3. Click **SQL Editor** to run custom queries

## Troubleshooting

### Build Fails

**Check build logs in Railway:**
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

**Common fixes:**
```bash
# Add engines to package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Database Connection Issues

**Verify connection string:**
- Ensure password doesn't have special characters (or URL encode them)
- Check if Supabase database is active
- Test connection locally first:

```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://postgres:..."

# Test connection
npx prisma db pull
```

### App Can't Connect to API

1. **Check Railway URL** - ensure it's publicly accessible
2. **Verify CORS settings** - make sure `*` is allowed or add your specific origin
3. **Check Railway service status** - ensure it's running
4. **Test with curl/Postman** before testing with mobile app

### Migration Fails

If Prisma migration fails:

```bash
# Reset database (⚠️ deletes all data)
railway run npx prisma migrate reset

# Or manually run migrations
railway run npx prisma migrate deploy
```

## Cost Estimation

### Free Tier Limits:
- **Railway**: $5 credit/month (enough for testing)
- **Supabase**: 500MB database, 1GB file storage, 2GB bandwidth

### When You Need to Upgrade:
- More than 100 concurrent users
- Database > 500MB
- High traffic (>2GB/month)

## Security Checklist

- [ ] Strong JWT secret generated
- [ ] Database password is secure
- [ ] Environment variables set (not hardcoded)
- [ ] CORS properly configured
- [ ] HTTPS enabled (Railway does this automatically)
- [ ] Database password changed from default
- [ ] Sensitive files (.env, credentials) in `.gitignore`

## Next Steps

1. **Set up file uploads**: Configure cloud storage (AWS S3, Cloudinary)
2. **Enable Google Vision AI**: For body measurements
3. **Add payment gateway**: Stripe or Paystack
4. **Set up monitoring**: Sentry, LogRocket, or DataDog
5. **Configure CI/CD**: Auto-deploy on git push

## Useful Commands

```bash
# View Railway logs
railway logs

# SSH into Railway container
railway shell

# Run Prisma Studio on Railway
railway run npx prisma studio

# Restart service
railway restart

# Check service status
railway status
```

## Support Resources

- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Community: Railway Discord, Supabase Discord

---

**⚠️ Important Notes:**

1. **Free tier limitations**: Monitor usage to avoid service interruptions
2. **Database backups**: Set up regular backups in Supabase (Settings > Database > Backups)
3. **SSL/TLS**: Railway handles this automatically
4. **Environment variables**: Never commit them to Git
5. **API Rate limiting**: Consider adding rate limiting for production

**🎉 Once deployed, your API URL will look like:**
```
https://qt-fashion-backend-production.up.railway.app
```

**Your mobile app will connect to:**
```
https://qt-fashion-backend-production.up.railway.app/api
```
