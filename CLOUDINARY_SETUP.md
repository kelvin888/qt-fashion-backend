# Cloudinary Setup Guide

## Why Cloudinary?

Cloudinary provides free cloud image storage with:
- ✅ **25 GB storage** + **25 GB bandwidth/month** (Free tier)
- ✅ Auto CDN delivery (fast globally)
- ✅ Built-in image optimization & transformations
- ✅ No Railway ephemeral storage issues

## Setup Steps

### 1. Create Cloudinary Account

1. Go to [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up with email or Google
3. Choose the **Free plan** (no credit card required)

### 2. Get Your Credentials

After signing in:
1. Go to **Dashboard** (https://cloudinary.com/console)
2. Find your credentials in the **Account Details** section:
   - **Cloud Name**: e.g., `dxxxxxxxx`
   - **API Key**: e.g., `123456789012345`
   - **API Secret**: e.g., `abcdefghijklmnopqrstuvwxyz`

### 3. Add to Railway Environment Variables

In your Railway dashboard:

1. Go to your **qt-fashion-backend** project
2. Click **Variables** tab
3. Add these three variables:

```
CLOUDINARY_CLOUD_NAME=dxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

**Important**: Replace the values with YOUR actual credentials from Cloudinary dashboard!

### 4. Deploy Changes

The code is already updated to use Cloudinary. Just commit and push:

```bash
cd qt-fashion-backend
git add -A
git commit -m "feat: Integrate Cloudinary for image storage"
git push origin master
```

Railway will auto-deploy with Cloudinary integration! 🚀

## How It Works

### Before (Local Storage)
```
User uploads image → Saved to ./uploads folder → Lost on redeploy ❌
```

### After (Cloudinary)
```
User uploads image → Uploaded to Cloudinary → Permanent cloud storage ✅
Image URL: https://res.cloudinary.com/yourcloud/qt-fashion/designs/abc123.jpg
```

## Image Organization

Images are automatically organized in folders:
- `qt-fashion/designs/` - Designer uploads
- `qt-fashion/measurements/` - User measurement photos
- `qt-fashion/try-on-temp/` - Temporary try-on uploads
- `qt-fashion/try-on-results/` - AI-generated try-on results

## Benefits

1. **Automatic Optimization**: Images are compressed and served in optimal format (WebP for modern browsers)
2. **Max 2000px**: Large images are automatically resized to save bandwidth
3. **CDN Delivery**: Images load fast worldwide
4. **No Storage Loss**: Files persist through all deployments
5. **Free Tier Covers**: ~5,000-10,000 design uploads per month

## Migration Notes

### Existing Uploads
- Old images in `./uploads` folder will NOT be migrated automatically
- They will be lost on next Railway deployment
- **Action Required**: Manually upload important existing images via the app OR run a migration script

### Mobile App
- Already updated to handle both:
  - Cloudinary URLs (new): `https://res.cloudinary.com/...`
  - Legacy local URLs (old): `https://api.railway.app/uploads/...`
- No mobile app changes needed!

## Cost Estimate

**Free Tier Limits**:
- 25 GB storage = ~50,000 high-quality design images
- 25 GB bandwidth = ~50,000 image views per month
- 7,500 transformations/month

**If you exceed free tier** (unlikely for MVP):
- $0.12 per additional GB storage/month
- $0.10 per additional GB bandwidth

**Expected costs for 1000 users**: $0/month (well within free tier)

## Troubleshooting

### Images not uploading?
1. Check Railway environment variables are set correctly
2. Verify Cloudinary credentials on https://cloudinary.com/console
3. Check Railway logs: `railway logs`

### Old images not showing?
- Expected! Old local uploads are lost on Railway redeploys
- Solution: Re-upload designs through the app

## Next Steps

1. ✅ Get Cloudinary credentials
2. ✅ Add to Railway environment variables
3. ✅ Push code to GitHub (triggers Railway redeploy)
4. ✅ Test by uploading a new design via mobile app
5. ✅ Verify image URL starts with `https://res.cloudinary.com/`

Done! Your images are now in the cloud. 🎉
