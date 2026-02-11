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
