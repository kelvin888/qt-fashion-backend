import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    res.status(200).json(user);
  } catch (error: any) {
    next(error);
  }
};

export const getDesignerProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const profile = await userService.getDesignerProfile(id);

    res.status(200).json(profile);
  } catch (error: any) {
    next(error);
  }
};

export const getUserMeasurements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const measurements = await userService.getUserMeasurements(id);

    res.status(200).json({
      success: true,
      data: measurements,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMyMeasurements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const measurements = await userService.getUserMeasurements(userId);

    res.status(200).json(measurements);
  } catch (error: any) {
    next(error);
  }
};

export const getActiveMeasurement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const measurement = await userService.getActiveMeasurement(id);

    res.status(200).json({
      success: true,
      data: measurement,
    });
  } catch (error: any) {
    next(error);
  }
};

export const createBodyMeasurement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // From auth middleware
    const {
      frontPhoto,
      sidePhoto,
      // Gender-specific measurements
      bust,
      underbust,
      chest,
      // Universal measurements
      waist,
      hips,
      height,
      shoulder,
      armLength,
      inseam,
      neck,
      captureMethod = 'PHOTO', // Default to PHOTO if not specified
    } = req.body;

    // Validate required universal measurement fields
    if (!waist || !hips || !height || !shoulder || !armLength || !inseam || !neck) {
      return res.status(400).json({
        success: false,
        message: 'Missing required measurement fields',
      });
    }

    // Validate gender-specific measurements (either chest OR bust must be provided)
    if (!chest && !bust) {
      return res.status(400).json({
        success: false,
        message: 'Either chest (for men) or bust (for women) measurement is required',
      });
    }

    // Validate photo requirement based on capture method
    if (captureMethod === 'PHOTO' && !frontPhoto) {
      return res.status(400).json({
        success: false,
        message: 'frontPhoto is required for photo capture method',
      });
    }

    console.log('📏 Creating body measurement for user:', userId, 'Method:', captureMethod);
    const measurement = await userService.createBodyMeasurement({
      userId,
      frontPhoto,
      sidePhoto,
      bust,
      underbust,
      chest,
      waist,
      hips,
      height,
      shoulder,
      armLength,
      inseam,
      neck,
      captureMethod,
    });

    console.log('✅ Body measurement created:', measurement.id);
    res.status(201).json({
      success: true,
      data: measurement,
    });
  } catch (error: any) {
    console.error('❌ Error creating body measurement:', error);
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const updateData = req.body;

    console.log('📝 Updating profile for user:', userId);
    const updatedUser = await userService.updateProfile(userId, updateData);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('❌ Error updating profile:', error);
    next(error);
  }
};
