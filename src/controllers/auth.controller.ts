import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { isValidEmail } from '../utils/validation';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phoneNumber, role } = req.body;

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

    const result = await authService.signup({
      email,
      password,
      fullName,
      phoneNumber,
      role,
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
