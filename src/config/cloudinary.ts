import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param filePath - Local file path to upload
 * @param folder - Cloudinary folder (e.g., 'designs', 'measurements', 'try-on-results')
 * @param publicId - Optional custom public ID
 */
export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `qt-fashion/${folder}`,
      public_id: publicId,
      resource_type: 'auto',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' }, // Max 2000px
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' }, // Auto format (WebP for browsers that support it)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

/**
 * Generate Cloudinary URL with transformations
 * @param publicId - Cloudinary public ID
 * @param transformations - Cloudinary transformation options
 */
export const getCloudinaryUrl = (publicId: string, transformations?: any): string => {
  return cloudinary.url(publicId, {
    secure: true,
    ...transformations,
  });
};

export default cloudinary;
