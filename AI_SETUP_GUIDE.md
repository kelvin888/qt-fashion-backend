# 🎨 AI Virtual Try-On Setup Guide

## Overview
Your backend now supports **high-accuracy AI virtual try-on** using Replicate + Hugging Face fallback.

## Cost Breakdown

### Replicate (Primary - High Accuracy)
- **Accuracy**: 90-95% (Production quality)
- **Model**: OOTDiffusion (State of the art)
- **Cost**: ~$0.01-0.05 per generation
- **Speed**: 5-15 seconds
- **Budget for validation**: 
  - $10 = 200-1000 try-ons
  - $20 = 400-2000 try-ons

### Hugging Face (Fallback - Free)
- **Accuracy**: 70-80% (Good for fallback)
- **Model**: IDM-VTON
- **Cost**: FREE (with rate limits)
- **Speed**: 20-60 seconds
- **Limit**: ~100 requests/day

## Setup Steps

### 1. Get Replicate API Token (5 minutes)

1. Go to https://replicate.com/
2. Sign up with GitHub (free)
3. Go to Account Settings → API Tokens
4. Copy your token (starts with `r8_...`)
5. Add $10-20 credit to your account for validation

### 2. Get Hugging Face API Key (Optional - Free Fallback)

1. Go to https://huggingface.co/
2. Sign up (free)
3. Go to Settings → Access Tokens
4. Create new token (read access)
5. Copy token (starts with `hf_...`)

### 3. Configure Environment Variables

#### Local Development (.env)
```bash
REPLICATE_API_TOKEN=r8_your_token_here
HUGGINGFACE_API_KEY=hf_your_token_here  # Optional fallback
```

#### Railway Production
Add these in Railway dashboard:
```
REPLICATE_API_TOKEN=r8_your_token_here
HUGGINGFACE_API_KEY=hf_your_token_here  # Optional
```

### 4. Test Locally

```bash
cd qt-fashion-backend
npm run dev
```

Use Postman/curl to test:
```bash
curl -X POST http://localhost:4000/api/try-on \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "userImage=@/path/to/user-photo.jpg" \
  -F "garmentImage=@/path/to/design.jpg"
```

### 5. Deploy to Railway

```bash
git add .
git commit -m "feat: Add AI virtual try-on with Replicate"
git push
```

Railway will auto-deploy with new environment variables.

## API Usage

### Endpoint
```
POST /api/try-on
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

### Request Body
```
userImage: File (JPG/PNG, max 10MB)
garmentImage: File (JPG/PNG, max 10MB)
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://replicate.delivery/...",
    "provider": "replicate",
    "processingTime": 8500
  }
}
```

### Response (Quota Exceeded)
```json
{
  "success": false,
  "message": "Hourly quota exceeded. Please try again later."
}
```

## Cost Controls

### Built-in Safety Features:
1. **Rate Limiting**: Max 100 requests/hour (adjustable in code)
2. **Fallback**: Auto-switches to Hugging Face if Replicate fails
3. **Monitoring**: `/api/try-on/stats` endpoint shows usage
4. **File Cleanup**: Uploaded images auto-deleted after processing

### Check Usage Stats
```bash
GET /api/try-on/stats
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "requestCount": 45,
    "maxRequests": 100,
    "remaining": 55
  }
}
```

## Optimization Tips

### For MVP Validation (Minimal Cost):
1. Start with $10 credit
2. Test with 5-10 designs only
3. Use same test photos for demos
4. Monitor usage with stats endpoint
5. Cache results in database (coming soon)

### Quality Settings (Adjustable in code):
```typescript
// In tryOn.service.ts - tryOnWithReplicate()
num_inference_steps: 20,  // Lower = faster/cheaper, Higher = better quality
guidance_scale: 2.0,      // Controls how closely it follows the garment
```

## Troubleshooting

### "No AI service configured"
- Check environment variables are set
- Restart server after adding tokens

### "Model is loading" (Hugging Face)
- Wait 20 seconds and retry
- This happens when model hasn't been used recently

### High costs
- Check stats endpoint for usage
- Reduce MAX_REQUESTS_PER_HOUR in code
- Implement caching (store results in DB)

### Poor quality results
- Ensure input images are clear and well-lit
- User photo should show full body/upper body
- Garment image should be on plain background
- Increase num_inference_steps (slower but better)

## Next Steps

1. ✅ Set up Replicate account ($10-20)
2. ✅ Add environment variables
3. ✅ Test locally with sample images
4. ✅ Deploy to Railway
5. ⏳ Update mobile app UI to use new endpoint
6. ⏳ Add result caching to database
7. ⏳ Implement user galleries

## Support Models

Currently using:
- **Replicate**: `levihsu/ootdiffusion` (Best quality)
- **Hugging Face**: `yisol/IDM-VTON` (Free fallback)

Alternative models (if needed):
- `viktorfa/oot_diffusion` (Faster but less accurate)
- `cuuupid/idm-vton` (Alternative VTON model)

## Expected Quality

### Replicate (OOTDiffusion):
- ✅ Realistic fabric wrinkles
- ✅ Accurate body proportions
- ✅ Good lighting adaptation
- ✅ Preserves design details
- ⚠️ May struggle with complex patterns

### Hugging Face (IDM-VTON):
- ✅ Fast processing
- ✅ Good for simple designs
- ⚠️ Less realistic lighting
- ⚠️ May distort patterns
- ⚠️ Occasional artifacts

---

**Budget Recommendation**: Start with **$10 Replicate credit** for MVP validation. This gives you 200-1000 high-quality try-ons.
