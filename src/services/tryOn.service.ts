import Replicate from 'replicate';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

interface TryOnResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  provider?: 'replicate' | 'huggingface';
  processingTime?: number;
}

class TryOnService {
  private replicate: Replicate | null = null;
  private huggingfaceApiKey: string | null = null;
  private requestCount: number = 0;
  private readonly MAX_REQUESTS_PER_HOUR = 100; // Safety limit

  constructor() {
    // Initialize Replicate if API token exists
    if (process.env.REPLICATE_API_TOKEN) {
      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
    }

    // Fallback to Hugging Face
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY || null;
  }

  /**
   * Main try-on function with Replicate (high accuracy)
   * Note: IDM-VTON works best with single garments (tops/shirts)
   * For full outfits, consider splitting into separate images or using the full garment image
   */
  async tryOnOutfit(userImagePath: string, garmentImagePath: string): Promise<TryOnResult> {
    const startTime = Date.now();

    // Rate limit check
    if (this.requestCount >= this.MAX_REQUESTS_PER_HOUR) {
      return {
        success: false,
        error: 'Hourly quota exceeded. Please try again later.',
      };
    }

    try {
      // Try Replicate first (best quality)
      if (this.replicate) {
        console.log('🎨 Using Replicate AI (High Accuracy Mode)...');
        console.log('📸 User image:', userImagePath);
        console.log('👗 Garment image:', garmentImagePath);
        
        const result = await this.tryOnWithReplicate(userImagePath, garmentImagePath);

        if (result.success) {
          this.requestCount++;
          return {
            ...result,
            provider: 'replicate',
            processingTime: Date.now() - startTime,
          };
        }
      }

      // Fallback to Hugging Face (free tier)
      if (this.huggingfaceApiKey) {
        console.log('🎨 Falling back to Hugging Face (Free Tier)...');
        const result = await this.tryOnWithHuggingFace(userImagePath, garmentImagePath);
        return {
          ...result,
          provider: 'huggingface',
          processingTime: Date.now() - startTime,
        };
      }

      // Final fallback: Simulated mode (for development/testing)
      console.log('🎨 Using Simulated Try-On (Development Mode)...');
      const result = await this.simulatedTryOn(userImagePath, garmentImagePath);
      return {
        ...result,
        provider: 'simulated' as any,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('❌ Try-on service error:', error);
      return {
        success: false,
        error: error.message || 'Virtual try-on failed',
      };
    }
  }

  /**
   * Replicate AI Implementation (OOTDiffusion - State of the art)
   */
  private async tryOnWithReplicate(
    userImagePath: string,
    garmentImagePath: string
  ): Promise<TryOnResult> {
    try {
      if (!this.replicate) {
        throw new Error('Replicate not initialized');
      }

      // Convert local file paths to base64 data URIs
      const userImageData = this.imageToDataUri(userImagePath);
      const garmentImageData = this.imageToDataUri(garmentImagePath);

      // Using Kolors Virtual Try-On - Full body outfit support
      // Model: kwai-kolors/kolors-virtual-try-on
      // This model supports FULL OUTFITS including both tops and bottoms
      console.log('🚀 Calling Replicate Kolors Virtual Try-On model...');
      console.log('ℹ️  This model supports full-body outfit try-on');
      
      const output = await this.replicate.run(
        'kwai-kolors/kolors-virtual-try-on:e20c1e369742d00c01bec9c9e0c1127e9612a4031954534bfeb3f0bf13ad73f4',
        {
          input: {
            human_image: userImageData,
            cloth_image: garmentImageData,
            num_inference_steps: 25, // Good balance between speed and quality
            guidance_scale: 2.5,
            seed: 42,
          },
        }
      );

      console.log('✅ Replicate API call completed');

      // Replicate output format (based on actual API response):
      // The model returns a direct string URL in most cases
      console.log('📦 Replicate raw output type:', typeof output);
      console.log('📦 Replicate raw output:', typeof output === 'string' ? output : JSON.stringify(output, null, 2));

      let imageUrl: string | undefined;

      // Handle direct string URL (most common)
      if (typeof output === 'string') {
        console.log('✓ Output is direct URL string');
        imageUrl = output;
      } 
      // Handle array of URLs
      else if (Array.isArray(output)) {
        console.log('✓ Output is array, length:', output.length);
        imageUrl = output[0];
      } 
      // Handle object response
      else if (output && typeof output === 'object') {
        console.log('✓ Output is object with keys:', Object.keys(output));
        // Try multiple possible property names
        imageUrl = (output as any).image || 
                   (output as any).output || 
                   (output as any).url ||
                   (output as any).result ||
                   (output as any).data;
      }

      if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('❌ Could not extract image URL from Replicate output');
        console.error('❌ Output type:', typeof output);
        console.error('❌ Output value:', output);
        throw new Error(`Invalid output from Replicate API`);
      }

      console.log('✅ Generated try-on image URL:', imageUrl);

      return {
        success: true,
        imageUrl,
      };
    } catch (error: any) {
      console.error('Replicate error:', error);
      throw error;
    }
  }

  /**
   * Hugging Face Fallback (Free but lower accuracy)
   */
  private async tryOnWithHuggingFace(
    userImagePath: string,
    garmentImagePath: string
  ): Promise<TryOnResult> {
    try {
      if (!this.huggingfaceApiKey) {
        throw new Error('Hugging Face API key not configured');
      }

      // Using yisol/IDM-VTON model
      const API_URL = 'https://api-inference.huggingface.co/models/yisol/IDM-VTON';

      const formData = new FormData();
      formData.append('model_image', fs.createReadStream(userImagePath));
      formData.append('cloth_image', fs.createReadStream(garmentImagePath));

      const response = await axios.post(API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.huggingfaceApiKey}`,
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds
      });

      // Save the generated image
      const outputDir = path.join(process.cwd(), 'uploads', 'try-on-results');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFileName = `tryon-${Date.now()}.png`;
      const outputPath = path.join(outputDir, outputFileName);

      fs.writeFileSync(outputPath, response.data);

      // Return relative URL (you'll need to serve this via Express static)
      const imageUrl = `/uploads/try-on-results/${outputFileName}`;

      return {
        success: true,
        imageUrl,
      };
    } catch (error: any) {
      console.error('Hugging Face error:', error);

      // Handle model loading errors
      if (error.response?.status === 503) {
        return {
          success: false,
          error: 'AI model is loading. Please try again in 20 seconds.',
        };
      }

      throw error;
    }
  }

  /**
   * Simulated try-on for development/testing (returns user image as result)
   * NOTE: Replace this with real AI service in production
   */
  private async simulatedTryOn(
    userImagePath: string,
    garmentImagePath: string
  ): Promise<TryOnResult> {
    try {
      console.log('⚠️ SIMULATED MODE: Using user photo as try-on result');
      console.log('📝 To enable real AI try-on:');
      console.log('   1. Add REPLICATE_API_TOKEN to Railway environment variables');
      console.log('   2. Or add HUGGINGFACE_API_KEY for free tier');
      console.log('   3. Redeploy backend');

      // Simulate processing delay (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For simulation, we'll return the user's photo
      // In production, this would be replaced with the actual try-on result
      // Return the user image path as the result
      // NOTE: This assumes userImagePath is a URL, not a local file path
      // The route handler will handle downloading from Cloudinary if needed

      return {
        success: true,
        imageUrl: userImagePath, // Just return user's photo for now
      };
    } catch (error: any) {
      console.error('Simulated try-on error:', error);
      throw error;
    }
  }

  /**
   * Convert local image to base64 data URI
   */
  private imageToDataUri(imagePath: string): string {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();

    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';

    return `data:${mimeType};base64,${base64Image}`;
  }

  /**
   * Reset hourly request counter (call this from a cron job)
   */
  resetRequestCount(): void {
    this.requestCount = 0;
    console.log('✅ Request counter reset');
  }

  /**
   * Get current usage stats
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.MAX_REQUESTS_PER_HOUR,
      remaining: this.MAX_REQUESTS_PER_HOUR - this.requestCount,
    };
  }
}

// Export singleton instance
export const tryOnService = new TryOnService();
export default tryOnService;
