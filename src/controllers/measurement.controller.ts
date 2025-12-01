import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// Simulated AI-powered measurement extraction
// This endpoint mimics what a real AI service (like Saia or Body Labs) would return
// Can be easily replaced with actual AI integration later without changing the API contract
const extractMeasurementsFromPhoto = async (photoPath: string): Promise<any> => {
  console.log('🤖 [SIMULATED AI] Analyzing photo for measurements:', path.basename(photoPath));

  // Simulate processing time (real AI takes 2-5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate realistic measurements with natural variation
  // In production, this would be replaced with actual AI service call
  const baseChest = 90 + Math.random() * 20; // 90-110 cm
  const baseWaist = 70 + Math.random() * 25; // 70-95 cm
  const baseHips = 90 + Math.random() * 20; // 90-110 cm
  const baseHeight = 160 + Math.random() * 30; // 160-190 cm

  // Calculate proportional measurements
  const shoulder = baseChest * 0.44 + Math.random() * 5; // ~44% of chest
  const armLength = baseHeight * 0.35 + Math.random() * 5; // ~35% of height
  const inseam = baseHeight * 0.45 + Math.random() * 5; // ~45% of height
  const neck = baseChest * 0.38 + Math.random() * 3; // ~38% of chest

  return {
    chest: Math.round(baseChest * 10) / 10, // Round to 1 decimal
    waist: Math.round(baseWaist * 10) / 10,
    hips: Math.round(baseHips * 10) / 10,
    height: Math.round(baseHeight * 10) / 10,
    shoulder: Math.round(shoulder * 10) / 10,
    armLength: Math.round(armLength * 10) / 10,
    inseam: Math.round(inseam * 10) / 10,
    neck: Math.round(neck * 10) / 10,
    aiConfidenceScore: 0.75 + Math.random() * 0.2, // 75-95% confidence
    aiMetadata: {
      model: 'simulated-ai-v1.0',
      provider: 'qt-fashion-mock', // Change to 'saia' or 'body-labs' when upgrading
      extractionMethod: 'automated-simulation',
      processingTimeMs: 1500,
      timestamp: new Date().toISOString(),
      note: 'This is a simulated AI response. Upgrade to real AI service for production.',
    },
  };
};

export const createMeasurement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check if files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files.frontPhoto || files.frontPhoto.length === 0) {
      return res.status(400).json({
        message: 'Front photo is required for measurement creation',
      });
    }

    const frontPhoto = files.frontPhoto[0];
    const sidePhoto = files.sidePhoto?.[0];

    // Generate file paths relative to uploads directory
    // Store photo URLs from Cloudinary
    const frontPhotoPath = frontPhoto.path; // Cloudinary secure_url
    const sidePhotoPath = sidePhoto ? sidePhoto.path : null;

    console.log('📸 Processing measurement photos...');
    console.log('Front photo:', frontPhotoPath);
    if (sidePhotoPath) console.log('Side photo:', sidePhotoPath);

    // Extract measurements from photo using AI
    const aiExtractedData = await extractMeasurementsFromPhoto(frontPhoto.path);

    // Allow manual measurements to override AI extracted ones
    const measurements = {
      chest: parseFloat(req.body.chest) || aiExtractedData.chest,
      waist: parseFloat(req.body.waist) || aiExtractedData.waist,
      hips: parseFloat(req.body.hips) || aiExtractedData.hips,
      height: parseFloat(req.body.height) || aiExtractedData.height,
      shoulder: parseFloat(req.body.shoulder) || aiExtractedData.shoulder,
      armLength: parseFloat(req.body.armLength) || aiExtractedData.armLength,
      inseam: parseFloat(req.body.inseam) || aiExtractedData.inseam,
      neck: parseFloat(req.body.neck) || aiExtractedData.neck,
    };

    // Deactivate previous measurements for this user
    await prisma.bodyMeasurement.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new measurement record
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId,
        frontPhoto: frontPhotoPath,
        sidePhoto: sidePhotoPath,
        chest: measurements.chest,
        waist: measurements.waist,
        hips: measurements.hips,
        height: measurements.height,
        shoulder: measurements.shoulder,
        armLength: measurements.armLength,
        inseam: measurements.inseam,
        neck: measurements.neck,
        aiConfidenceScore: aiExtractedData.aiConfidenceScore,
        aiMetadata: aiExtractedData.aiMetadata,
        isActive: true,
      },
    });

    console.log('✅ Measurement created successfully:', measurement.id);

    res.status(201).json({
      message: 'Measurement created successfully',
      measurement: {
        id: measurement.id,
        frontPhoto: measurement.frontPhoto,
        sidePhoto: measurement.sidePhoto,
        chest: measurement.chest,
        waist: measurement.waist,
        hips: measurement.hips,
        height: measurement.height,
        shoulder: measurement.shoulder,
        armLength: measurement.armLength,
        inseam: measurement.inseam,
        neck: measurement.neck,
        aiConfidenceScore: measurement.aiConfidenceScore,
        isActive: measurement.isActive,
        createdAt: measurement.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating measurement:', error);
    res.status(500).json({
      message: 'Failed to create measurement',
      error: error.message,
    });
  }
};

export const getMeasurements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        frontPhoto: true,
        sidePhoto: true,
        chest: true,
        waist: true,
        hips: true,
        height: true,
        shoulder: true,
        armLength: true,
        inseam: true,
        neck: true,
        aiConfidenceScore: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Measurements retrieved successfully',
      measurements,
      count: measurements.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching measurements:', error);
    res.status(500).json({
      message: 'Failed to fetch measurements',
      error: error.message,
    });
  }
};

export const getActiveMeasurement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const measurement = await prisma.bodyMeasurement.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        frontPhoto: true,
        sidePhoto: true,
        chest: true,
        waist: true,
        hips: true,
        height: true,
        shoulder: true,
        armLength: true,
        inseam: true,
        neck: true,
        aiConfidenceScore: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!measurement) {
      return res.status(404).json({
        message: 'No active measurement found',
      });
    }

    res.json({
      message: 'Active measurement retrieved successfully',
      measurement,
    });
  } catch (error: any) {
    console.error('❌ Error fetching active measurement:', error);
    res.status(500).json({
      message: 'Failed to fetch active measurement',
      error: error.message,
    });
  }
};

export const updateMeasurement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Check if measurement exists and belongs to user
    const existingMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { id, userId },
    });

    if (!existingMeasurement) {
      return res.status(404).json({
        message: 'Measurement not found',
      });
    }

    // Handle file uploads if provided - using Cloudinary
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = {};

    if (files?.frontPhoto?.[0]) {
      updateData.frontPhoto = (files.frontPhoto[0] as any).path; // Cloudinary URL
    }

    if (files?.sidePhoto?.[0]) {
      updateData.sidePhoto = (files.sidePhoto[0] as any).path; // Cloudinary URL
    }

    // Update measurements if provided
    if (req.body.chest) updateData.chest = parseFloat(req.body.chest);
    if (req.body.waist) updateData.waist = parseFloat(req.body.waist);
    if (req.body.hips) updateData.hips = parseFloat(req.body.hips);
    if (req.body.height) updateData.height = parseFloat(req.body.height);
    if (req.body.shoulder) updateData.shoulder = parseFloat(req.body.shoulder);
    if (req.body.armLength) updateData.armLength = parseFloat(req.body.armLength);
    if (req.body.inseam) updateData.inseam = parseFloat(req.body.inseam);
    if (req.body.neck) updateData.neck = parseFloat(req.body.neck);

    const measurement = await prisma.bodyMeasurement.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Measurement updated successfully',
      measurement,
    });
  } catch (error: any) {
    console.error('❌ Error updating measurement:', error);
    res.status(500).json({
      message: 'Failed to update measurement',
      error: error.message,
    });
  }
};

export const deleteMeasurement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Check if measurement exists and belongs to user
    const existingMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { id, userId },
    });

    if (!existingMeasurement) {
      return res.status(404).json({
        message: 'Measurement not found',
      });
    }

    await prisma.bodyMeasurement.delete({
      where: { id },
    });

    res.json({
      message: 'Measurement deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error deleting measurement:', error);
    res.status(500).json({
      message: 'Failed to delete measurement',
      error: error.message,
    });
  }
};

export const setActiveMeasurement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Check if measurement exists and belongs to user
    const existingMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { id, userId },
    });

    if (!existingMeasurement) {
      return res.status(404).json({
        message: 'Measurement not found',
      });
    }

    // Deactivate all other measurements
    await prisma.bodyMeasurement.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Activate the selected measurement
    const measurement = await prisma.bodyMeasurement.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({
      message: 'Active measurement set successfully',
      measurement,
    });
  } catch (error: any) {
    console.error('❌ Error setting active measurement:', error);
    res.status(500).json({
      message: 'Failed to set active measurement',
      error: error.message,
    });
  }
};
