import Replicate from 'replicate';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../config/cloudinary';

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

      // Using Generative AI Virtual Try-On
      // Using a model that takes BOTH user image AND garment image
      console.log('🚀 Using AI Virtual Try-On...');
      console.log('👤 User image:', userImagePath);
      console.log('👗 Garment image:', garmentImagePath);

      // Try using IDM-VTON which is designed for virtual try-on
      // It takes both person image and garment image
      const output: any = await this.replicate.run(
        'cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
        {
          input: {
            garm_img: garmentImageData, // Garment/design to wear
            human_img: userImageData, // User photo
            garment_des: 'complete outfit with top and bottom', // Description
            is_checked: true,
            is_checked_crop: false,
            denoise_steps: 30,
            seed: 42,
          },
        }
      );

      console.log('✅ Replicate API call completed');
      console.log('🔍 CODE VERSION: 2025-12-02-v13 (SAVE BINARY & UPLOAD)');
      console.log('📦 Raw output type:', typeof output);
      console.log('📦 Is array:', Array.isArray(output));

      let imageUrl: string | undefined;

      // Handle ReadableStream with BINARY data (IDM-VTON returns image bytes)
      if (output && typeof output === 'object' && 'getReader' in output) {
        console.log('📦 Output is ReadableStream, consuming binary stream...');
        const reader = (output as any).getReader();
        const chunks: Uint8Array[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
            }
          }

          // Combine all chunks into single buffer
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const imageBuffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            imageBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          console.log('📦 Stream consumed, total bytes:', imageBuffer.length);
          console.log('📦 First few bytes:', imageBuffer.slice(0, 20));

          // Check if it's binary image data (starts with JPEG/PNG magic bytes)
          const isJPEG = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
          const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;

          if (isJPEG || isPNG) {
            console.log('📦 Binary image detected, saving to file...');
            
            // Save to temp file
            const tempFileName = `tryon-result-${Date.now()}.${isJPEG ? 'jpg' : 'png'}`;
            const tempFilePath = path.join('/tmp', tempFileName);
            fs.writeFileSync(tempFilePath, Buffer.from(imageBuffer));
            console.log('📦 Temp file saved:', tempFilePath);

            // Upload to Cloudinary
            console.log('📦 Uploading to Cloudinary...');
            const uploadResult = await uploadToCloudinary(tempFilePath, 'try-on-results');
            imageUrl = uploadResult.url;
            console.log('📦 Cloudinary URL:', imageUrl);

            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            console.log('📦 Temp file cleaned up');
          } else {
            // Try as text (maybe it's a URL string after all)
            const decoder = new TextDecoder();
            const text = decoder.decode(imageBuffer);
            console.log('📦 Decoded as text:', text.substring(0, 200));
            if (text.startsWith('http')) {
              imageUrl = text.trim();
            }
          }
        } catch (error) {
          console.error('❌ Error reading stream:', error);
        }
      }
      // Handle direct string
      else if (typeof output === 'string') {
        console.log('📦 Direct string output');
        imageUrl = output;
      }
      // Handle array (SDXL style)
      else if (Array.isArray(output) && output.length > 0) {
        console.log('📦 Array with', output.length, 'elements');
        const firstElement = output[0];
        console.log('📦 First element type:', typeof firstElement);

        // Direct string URL
        if (typeof firstElement === 'string') {
          console.log('📦 Element is string URL');
          imageUrl = firstElement;
        }
        // FileOutput object (SDXL style)
        else if (firstElement && typeof firstElement === 'object') {
          console.log('📦 Element is object, checking url property...');

          // Try calling url() if it's a function (SDXL style)
          if (typeof (firstElement as any).url === 'function') {
            console.log('📦 url is a function, calling it...');
            let urlResult = (firstElement as any).url();

            // Check if it returns a promise
            if (urlResult && typeof urlResult.then === 'function') {
              urlResult = await urlResult;
            }

            // Convert URL object to string if needed
            if (urlResult && typeof urlResult === 'object' && 'href' in urlResult) {
              console.log('📦 URL is an object with href property');
              imageUrl = urlResult.href;
            } else if (typeof urlResult === 'string') {
              imageUrl = urlResult;
            } else if (urlResult) {
              imageUrl = String(urlResult);
            }
          }
          // Direct property access
          else if ('url' in firstElement) {
            console.log('📦 url is a property');
            const urlValue = (firstElement as any).url;
            if (urlValue && typeof urlValue === 'object' && 'href' in urlValue) {
              imageUrl = urlValue.href;
            } else {
              imageUrl = urlValue;
            }
          }
        }
      }

      console.log('📦 Final imageUrl:', imageUrl);
      console.log('📦 Final URL type:', typeof imageUrl);

      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        console.error('❌ Invalid or missing URL');
        console.error('❌ imageUrl value:', imageUrl);
        console.error('❌ imageUrl type:', typeof imageUrl);
        throw new Error('Invalid output from Replicate API');
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
