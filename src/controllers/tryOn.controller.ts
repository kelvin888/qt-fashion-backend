import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import axios from 'axios';
import { Readable } from 'stream';

const EXTERNAL_TRY_ON_API =
  process.env.EXTERNAL_TRY_ON_API_URL || 'https://fashion-api.ddns.net/try-on/api/v1/try-on';

/**
 * Proxy endpoint for virtual try-on
 * Forwards multipart file uploads to external try-on API
 */
export const proxyTryOn = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  console.log('🎨 Try-on proxy request received');

  try {
    // Validate files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files?.person_image || !files?.clothing_design) {
      console.error('❌ Missing required files');
      return res.status(400).json({
        success: false,
        message: 'Both person_image and clothing_design files are required',
      });
    }

    const personImage = files.person_image[0];
    const clothingDesign = files.clothing_design[0];

    console.log('📸 Person image:', {
      filename: personImage.originalname,
      size: personImage.size,
      mimetype: personImage.mimetype,
      cloudinaryUrl: (personImage as any).path,
    });

    console.log('👗 Clothing design:', {
      filename: clothingDesign.originalname,
      size: clothingDesign.size,
      mimetype: clothingDesign.mimetype,
      cloudinaryUrl: (clothingDesign as any).path,
    });

    // Create FormData for external API
    const formData = new FormData();

    // Download images from Cloudinary and append as streams
    const personImageUrl = (personImage as any).path;
    const clothingDesignUrl = (clothingDesign as any).path;

    console.log('🌐 Downloading images from Cloudinary...');

    const [personImageResponse, clothingDesignResponse] = await Promise.all([
      axios.get(personImageUrl, { responseType: 'arraybuffer' }),
      axios.get(clothingDesignUrl, { responseType: 'arraybuffer' }),
    ]);

    console.log('✅ Images downloaded');

    // Append files to FormData
    formData.append('person_image', Buffer.from(personImageResponse.data), {
      filename: 'person.jpg',
      contentType: 'image/jpeg',
    });

    formData.append('clothing_design', Buffer.from(clothingDesignResponse.data), {
      filename: 'design.jpg',
      contentType: 'image/jpeg',
    });

    console.log('🚀 Forwarding to external try-on API:', EXTERNAL_TRY_ON_API);

    // Forward request to external API
    const apiResponse = await axios.post(EXTERNAL_TRY_ON_API, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 180000, // 3 minutes timeout
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Try-on completed in ${processingTime}ms`);

    // Extract result URL from various possible field names
    const data = apiResponse.data;
    const resultUrl =
      data.result_url ||
      data.output_image_url ||
      data.imageUrl ||
      data.image_url ||
      data.url ||
      data.output_url;

    if (!resultUrl) {
      console.error('❌ No result URL in response:', data);
      return res.status(500).json({
        success: false,
        message: 'Try-on completed but no result image URL found',
        rawResponse: data,
      });
    }

    console.log('🖼️ Result URL:', resultUrl);

    // Return standardized response
    res.json({
      success: true,
      data: {
        imageUrl: resultUrl,
        provider: 'external-api',
        processingTime,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Try-on proxy error:', error.message);

    // Handle specific error types
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        message: 'Try-on service timed out. Please try with clearer/smaller images.',
        error: 'timeout',
        processingTime,
      });
    }

    if (error.response) {
      // External API returned an error
      console.error('External API error:', error.response.status, error.response.data);
      return res.status(error.response.status).json({
        success: false,
        message:
          error.response.data?.detail || error.response.data?.message || 'Try-on service error',
        error: error.response.data,
        processingTime,
      });
    }

    // Network or other error
    res.status(500).json({
      success: false,
      message: 'Virtual try-on failed. Please try again.',
      error: error.message,
      processingTime,
    });
  }
};

/**
 * Get try-on usage statistics (placeholder)
 */
export const getTryOnStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement actual usage tracking in database
    res.json({
      success: true,
      data: {
        requestCount: 0,
        maxRequests: 100,
        remaining: 100,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
