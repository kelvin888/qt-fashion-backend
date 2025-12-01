import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Create a new design (Designer only)
 * POST /api/designs
 */
export const createDesign = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = (req as any).user.id;

    // Validate user is a designer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'DESIGNER') {
      return res.status(403).json({
        success: false,
        message: 'Only designers can create designs',
      });
    }

    // Validate request
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one design image is required',
      });
    }

    const { title, description, category, price, fabricType, colors, sizes, productionTime } =
      req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, and price are required',
      });
    }

    // Process uploaded images
    const imageUrls = files.map((file) => `/uploads/${path.basename(file.path)}`);
    const thumbnailUrl = imageUrls[0]; // First image as thumbnail

    // Parse arrays if they're JSON strings
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors || [];
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes || ['custom'];

    // Create design
    const design = await prisma.design.create({
      data: {
        designerId: userId,
        title,
        description,
        category,
        price: parseFloat(price),
        images: JSON.stringify(imageUrls),
        thumbnailUrl,
        fabricType: fabricType || null,
        colors: JSON.stringify(parsedColors),
        sizes: JSON.stringify(parsedSizes),
        productionTime: parseInt(productionTime) || 14,
      },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    console.log(`✅ Design created: ${design.title} by ${user.name}`);

    res.status(201).json({
      success: true,
      data: {
        ...design,
        images: JSON.parse(design.images),
        colors: JSON.parse(design.colors),
        sizes: JSON.parse(design.sizes),
      },
    });
  } catch (error: any) {
    console.error('❌ Create design error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create design',
    });
  }
};

/**
 * Get all designs (Public with filters)
 * GET /api/designs
 */
export const getDesigns = async (req: Request, res: Response) => {
  try {
    const {
      category,
      designerId,
      minPrice,
      maxPrice,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (designerId) {
      where.designerId = designerId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get designs
    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.design.count({ where }),
    ]);

    // Parse JSON fields
    const parsedDesigns = designs.map((design) => ({
      ...design,
      images: JSON.parse(design.images),
      colors: JSON.parse(design.colors),
      sizes: JSON.parse(design.sizes),
    }));

    res.json({
      success: true,
      data: parsedDesigns,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('❌ Get designs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch designs',
    });
  }
};

/**
 * Get single design by ID
 * GET /api/designs/:id
 */
export const getDesignById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    // Parse JSON fields
    const parsedDesign = {
      ...design,
      images: JSON.parse(design.images),
      colors: JSON.parse(design.colors),
      sizes: JSON.parse(design.sizes),
    };

    res.json({
      success: true,
      data: parsedDesign,
    });
  } catch (error: any) {
    console.error('❌ Get design error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch design',
    });
  }
};

/**
 * Update design (Designer only - own designs)
 * PUT /api/designs/:id
 */
export const updateDesign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const files = req.files as Express.Multer.File[];

    // Check ownership
    const existingDesign = await prisma.design.findUnique({
      where: { id },
    });

    if (!existingDesign) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    if (existingDesign.designerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own designs',
      });
    }

    // Prepare update data
    const updateData: any = {};
    const {
      title,
      description,
      category,
      price,
      fabricType,
      colors,
      sizes,
      productionTime,
      isActive,
    } = req.body;

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (fabricType) updateData.fabricType = fabricType;
    if (productionTime) updateData.productionTime = parseInt(productionTime);
    if (typeof isActive !== 'undefined')
      updateData.isActive = isActive === 'true' || isActive === true;

    // Handle new images
    if (files && files.length > 0) {
      const imageUrls = files.map((file) => `/uploads/${path.basename(file.path)}`);
      updateData.images = JSON.stringify(imageUrls);
      updateData.thumbnailUrl = imageUrls[0];

      // TODO: Delete old images
    }

    if (colors) {
      updateData.colors = typeof colors === 'string' ? colors : JSON.stringify(colors);
    }

    if (sizes) {
      updateData.sizes = typeof sizes === 'string' ? sizes : JSON.stringify(sizes);
    }

    // Update design
    const design = await prisma.design.update({
      where: { id },
      data: updateData,
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    console.log(`✅ Design updated: ${design.title}`);

    res.json({
      success: true,
      data: {
        ...design,
        images: JSON.parse(design.images),
        colors: JSON.parse(design.colors),
        sizes: JSON.parse(design.sizes),
      },
    });
  } catch (error: any) {
    console.error('❌ Update design error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update design',
    });
  }
};

/**
 * Delete design (Designer only - own designs)
 * DELETE /api/designs/:id
 */
export const deleteDesign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Check ownership
    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found',
      });
    }

    if (design.designerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own designs',
      });
    }

    // Soft delete (set isActive to false)
    await prisma.design.update({
      where: { id },
      data: { isActive: false },
    });

    console.log(`✅ Design deleted: ${design.title}`);

    res.json({
      success: true,
      message: 'Design deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Delete design error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete design',
    });
  }
};

/**
 * Get designer's own designs
 * GET /api/designs/my-designs
 */
export const getMyDesigns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = '1', limit = '20', includeInactive = 'false' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      designerId: userId,
    };

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              orders: true,
              tryOns: true,
            },
          },
        },
      }),
      prisma.design.count({ where }),
    ]);

    // Parse JSON fields
    const parsedDesigns = designs.map((design) => ({
      ...design,
      images: JSON.parse(design.images),
      colors: JSON.parse(design.colors),
      sizes: JSON.parse(design.sizes),
    }));

    res.json({
      success: true,
      data: parsedDesigns,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('❌ Get my designs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch designs',
    });
  }
};
