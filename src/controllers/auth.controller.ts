import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { isValidEmail } from '../utils/validation';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      fullName,
      phoneNumber,
      role,
      gender,
      // Designer-specific fields
      brandName,
      brandLogo,
      brandBanner,
      bio,
      yearsOfExperience,
      specialties,
    } = req.body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        message: 'Missing required fields: email, password, fullName, role',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Invalid email address format',
      });
    }

    if (!['customer', 'designer', 'CUSTOMER', 'DESIGNER'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be customer or designer',
      });
    }

    // Validate designer-specific required fields
    if (role.toUpperCase() === 'DESIGNER') {
      if (!brandName || !brandName.trim()) {
        return res.status(400).json({
          message: 'Brand name is required for designers',
        });
      }
      if (!bio || !bio.trim()) {
        return res.status(400).json({
          message: 'Bio is required for designers',
        });
      }
    }

    const result = await authService.signup({
      email,
      password,
      fullName,
      phoneNumber,
      role,
      gender,
      brandName,
      brandLogo,
      brandBanner,
      bio,
      yearsOfExperience,
      specialties,
    });

    res.status(201).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Missing required fields: email, password',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Invalid email address format',
      });
    }

    const result = await authService.login({ email, password });

    res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await authService.getProfile(userId);

    res.status(200).json(user);
  } catch (error: any) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  // Server-side logout would require token blacklisting (optional enhancement)
  res.status(200).json({ message: 'Logged out successfully' });
};

export const updatePushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { expoPushToken } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!expoPushToken) {
      return res.status(400).json({ message: 'expoPushToken is required' });
    }

    await authService.updatePushToken(userId, expoPushToken);

    res.status(200).json({ message: 'Push token updated successfully' });
  } catch (error: any) {
    next(error);
  }
};

export const removePushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await authService.removePushToken(userId);

    res.status(200).json({ message: 'Push token removed successfully' });
  } catch (error: any) {
    next(error);
  }
};

/**
 * One-time admin creation endpoint
 * @security Protected by ADMIN_CREATION_SECRET environment variable
 * @access Public (but requires secret key)
 * @route POST /api/auth/create-admin
 * 
 * @description
 * Creates the first admin user for the platform. This endpoint should be:
 * 1. Used only once during initial deployment
 * 2. Disabled after creating the first admin (remove ADMIN_CREATION_SECRET)
 * 3. Protected with a strong, randomly generated secret key
 * 
 * @important After creating admin, immediately:
 * - Remove ADMIN_CREATION_SECRET from environment variables
 * - Login and change the password
 * - Enable additional security measures
 */
export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, secretKey } = req.body;

    // Validate secret key exists in environment
    const expectedSecret = process.env.ADMIN_CREATION_SECRET;
    
    if (!expectedSecret) {
      console.error('❌ ADMIN_CREATION_SECRET not configured in environment');
      return res.status(500).json({
        success: false,
        message: 'Admin creation endpoint not properly configured',
      });
    }

    // Validate provided secret matches environment
    if (secretKey !== expectedSecret) {
      console.warn('🚨 Invalid admin creation attempt', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid secret key',
      });
    }

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Enforce strong password requirements
    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters long',
      });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, number, and special character',
      });
    }

    // Create admin using auth service
    const result = await authService.createAdminUser({
      email,
      password,
      fullName,
    });

    console.log('✅ Admin user created successfully', {
      id: result.user.id,
      email: result.user.email,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully. Please remove ADMIN_CREATION_SECRET from environment variables.',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Admin creation error:', error);
    
    // Check for specific error messages from service
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    
    next(error);
  }
};

/**
 * Check admin creation endpoint status and provide security recommendations
 * @access Admin only (requires valid JWT)
 * @route GET /api/auth/admin-status
 */
export const checkAdminCreationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = await authService.getAdminCreationStatus();

    let recommendation: string;
    
    if (status.adminCount === 0) {
      recommendation = 'No admin users exist. Use /api/auth/create-admin endpoint to create first admin.';
    } else if (status.isEnabled) {
      recommendation = '⚠️ SECURITY WARNING: Admin creation endpoint is still enabled. Remove ADMIN_CREATION_SECRET from environment variables immediately.';
    } else {
      recommendation = '✅ Admin creation endpoint is properly disabled. System is secure.';
    }

    res.json({
      success: true,
      data: {
        ...status,
        recommendation,
        securityLevel: status.isEnabled && status.adminCount > 0 ? 'VULNERABLE' : 'SECURE',
      },
    });
  } catch (error: any) {
    console.error('❌ Error checking admin status:', error);
    next(error);
  }
};
