import multer from 'multer';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// Configure Cloudinary storage
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder based on field name
    let folder = 'qt-fashion/misc';
    if (file.fieldname.includes('design') || file.fieldname === 'images') {
      folder = 'qt-fashion/designs';
    } else if (file.fieldname.includes('Photo') || file.fieldname.includes('measurement')) {
      folder = 'qt-fashion/measurements';
    } else if (file.fieldname.includes('user') || file.fieldname.includes('garment')) {
      folder = 'qt-fashion/try-on-temp';
    }

    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 2000, height: 2000, crop: 'limit' }, { quality: 'auto:good' }],
    };
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer with Cloudinary storage
export const upload = multer({
  storage: cloudinaryStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});
