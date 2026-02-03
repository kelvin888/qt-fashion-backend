import { Request, Response, NextFunction } from 'express';
import designService from '../services/design.service';

// Helper function to normalize category names (handles "Evening/Cocktail" → "EVENING_COCKTAIL")
const normalizeCategory = (category: string): string => {
  return category.replace(/[\/\s-]+/g, '_').toUpperCase();
};
export const createDesign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      price,
      images,
      category,
      fabricType,
      colors,
      sizes,
      customizable,
      customizations,
    } = req.body;

    // Validation - only require essential fields
    if (!title || price === undefined || !images || !category) {
      return res.status(400).json({
        message: 'Missing required fields: title, price, images, category',
      });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        message: 'At least one image is required',
      });
    }

    const design = await designService.createDesign({
      designerId: req.user!.id,
      title,
      description: description || '',
      price: parseFloat(price),
      images,
      category: normalizeCategory(category),
      fabricType,
      colors: colors || [],
      sizes: sizes || [],
      customizable: customizable !== undefined ? customizable : true,
      customizations,
    });

    res.status(201).json(design);
  } catch (error: any) {
    next(error);
  }
};

export const getDesigns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      designerId,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const filters: any = {};

    if (category) {
      filters.category = (category as string).toUpperCase();
    }

    if (minPrice) {
      filters.minPrice = parseFloat(minPrice as string);
    }

    if (maxPrice) {
      filters.maxPrice = parseFloat(maxPrice as string);
    }

    if (designerId) {
      filters.designerId = designerId as string;
    }

    if (search) {
      filters.search = search as string;
    }

    const result = await designService.getDesigns(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getDesignById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const design = await designService.getDesignById(id);

    res.status(200).json(design);
  } catch (error: any) {
    next(error);
  }
};

export const updateDesign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Normalize category if provided
    if (updateData.category) {
      updateData.category = normalizeCategory(updateData.category);
    }

    // Convert price to number if provided
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }

    const design = await designService.updateDesign(id, req.user!.id, updateData);

    res.status(200).json(design);
  } catch (error: any) {
    next(error);
  }
};

export const deleteDesign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await designService.deleteDesign(id, req.user!.id);

    res.status(200).json(result);
  } catch (error: any) {
    next(error);
  }
};

export const getDesigners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const designers = await designService.getDesigners();

    res.status(200).json(designers);
  } catch (error: any) {
    next(error);
  }
};
