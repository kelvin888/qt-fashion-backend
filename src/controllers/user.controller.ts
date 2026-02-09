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
      chest,
      waist,
      hips,
      height,
      shoulder,
      armLength,
      inseam,
      neck,
      captureMethod = 'PHOTO', // Default to PHOTO if not specified
    } = req.body;

    // Validate required measurement fields
    if (!chest || !waist || !hips || !height || !shoulder || !armLength || !inseam || !neck) {
      return res.status(400).json({
        success: false,
        message: 'Missing required measurement fields',
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
