# Cloudinary Environment Variables Setup

## 📋 Copy-Paste Commands for Railway

Once you have your Cloudinary credentials, run these commands in the Railway CLI or add them in the Railway dashboard:

### Option 1: Railway Dashboard (Recommended)

1. Go to: https://railway.app/dashboard
2. Select your **qt-fashion-backend** project
3. Click **Variables** tab
4. Click **+ New Variable** for each:

```
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=REPLACE_WITH_YOUR_API_KEY
CLOUDINARY_API_SECRET=REPLACE_WITH_YOUR_API_SECRET
```

### Option 2: Railway CLI

If you have Railway CLI installed, run:

```bash
railway variables set CLOUDINARY_CLOUD_NAME="REPLACE_WITH_YOUR_CLOUD_NAME"
railway variables set CLOUDINARY_API_KEY="REPLACE_WITH_YOUR_API_KEY"
railway variables set CLOUDINARY_API_SECRET="REPLACE_WITH_YOUR_API_SECRET"
```

---

## 🔑 Where to Get Your Credentials

1. **Sign up**: https://cloudinary.com/users/register/free
2. **Get credentials**: https://cloudinary.com/console
3. Look for **Account Details** section on dashboard
4. Copy the three values

---

## ✅ Verification Steps

After adding variables:

1. Railway will auto-redeploy your backend
2. Check logs for any Cloudinary errors: `railway logs`
3. Test by uploading a design through mobile app
4. Image URL should start with: `https://res.cloudinary.com/YOUR_CLOUD_NAME/`

---

## 📝 Example (DO NOT USE THESE VALUES)

```
CLOUDINARY_CLOUD_NAME=dxxxxxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz1234
```

These are just examples! Use YOUR actual credentials from Cloudinary dashboard.
