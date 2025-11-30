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
   */
  async tryOnOutfit(
    userImagePath: string,
    garmentImagePath: string
  ): Promise<TryOnResult> {
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

      return {
        success: false,
        error: 'No AI service configured. Please add REPLICATE_API_TOKEN or HUGGINGFACE_API_KEY.',
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

      // Using OOTDiffusion (OutfitAnyone) - Best virtual try-on model
      // Model: levihsu/ootdiffusion
      const output = await this.replicate.run(
        "levihsu/ootdiffusion:36ccf8cf0cc99b7184a9cb1fb26dd83b2cb63b7c83cfa06b8c1e36c0b08adaa4",
        {
          input: {
            model_image: userImageData,
            cloth_image: garmentImageData,
            category: "upper_body", // Options: upper_body, lower_body, dresses
            num_inference_steps: 20, // Balance speed vs quality
            guidance_scale: 2.0,
            seed: -1, // Random seed
          }
        }
      );

      // Replicate returns array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Invalid output from Replicate');
      }

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
          'Authorization': `Bearer ${this.huggingfaceApiKey}`,
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
