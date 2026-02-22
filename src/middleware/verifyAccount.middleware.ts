import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify that a user's account has been approved by admin
 * Used for designer-specific operations that require account verification
 */
export const requireVerifiedAccount = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!user.accountVerified) {
    return res.status(403).json({
      success: false,
      message:
        'Your account is pending admin approval. You cannot perform this action until your account is verified.',
      verified: false,
    });
  }

  next();
};
