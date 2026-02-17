import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateDesignData {
  designerId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string; // Dynamic category - no longer restricted to enum
  fabricType?: string;
  colors: string[];
  sizes: string[];
  customizable?: boolean;
  customizations?: any;
  productionSteps?: Array<{
    title: string;
    estimatedTime: string;
    description: string;
  }>;
}

export interface UpdateDesignData {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  category?: string;
  fabricType?: string;
  colors?: string[];
  sizes?: string[];
  customizable?: boolean;
  customizations?: any;
}

export interface DesignFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  designerId?: string;
  search?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest';
}

class DesignService {
  async createDesign(data: CreateDesignData) {
    const design = await prisma.design.create({
      data: {
        designerId: data.designerId,
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        category: data.category,
        fabricType: data.fabricType,
        colors: data.colors,
        sizes: data.sizes,
        customizable: data.customizable || false,
        customizations: data.customizations,
        productionSteps: data.productionSteps,
      },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
          },
        },
      },
    });

    return design;
  }

  async getDesigns(filters: DesignFilters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.designerId) {
      where.designerId = filters.designerId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' }; // default: newest first
    if (filters.sortBy === 'price-asc') {
      orderBy = { price: 'asc' };
    } else if (filters.sortBy === 'price-desc') {
      orderBy = { price: 'desc' };
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
              brandLogo: true,
            },
          },
        },
      }),
      prisma.design.count({ where }),
    ]);

    return {
      designs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDesignById(id: string) {
    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            brandBanner: true,
            bio: true,
          },
        },
      },
    });

    if (!design) {
      throw new Error('Design not found');
    }

    // Increment views
    await prisma.design.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return design;
  }

  async updateDesign(id: string, designerId: string, data: UpdateDesignData) {
    // Check if design exists and belongs to designer
    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      throw new Error('Design not found');
    }

    if (design.designerId !== designerId) {
      throw new Error('Unauthorized to update this design');
    }

    const updated = await prisma.design.update({
      where: { id },
      data,
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
          },
        },
      },
    });

    return updated;
  }

  async deleteDesign(id: string, designerId: string) {
    // Check if design exists and belongs to designer
    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      throw new Error('Design not found');
    }

    if (design.designerId !== designerId) {
      throw new Error('Unauthorized to delete this design');
    }

    await prisma.design.delete({
      where: { id },
    });

    return { message: 'Design deleted successfully' };
  }

  async getRelatedDesigns(designId: string, limit = 8) {
    // Get the current design
    const currentDesign = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        category: true,
        price: true,
        fabricType: true,
        colors: true,
        designerId: true,
      },
    });

    if (!currentDesign) {
      throw new Error('Design not found');
    }

    // Calculate price range (±30% for better results)
    const priceMin = currentDesign.price * 0.7;
    const priceMax = currentDesign.price * 1.3;

    // STRATEGY 1: Try to fetch designs from different designers (preferred)
    let candidates = await prisma.design.findMany({
      where: {
        category: currentDesign.category,
        designerId: { not: currentDesign.designerId },
        id: { not: designId },
      },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
          },
        },
      },
      take: 50,
    });

    // STRATEGY 2: If no different designer designs, fetch from same category (including same designer)
    if (candidates.length === 0) {
      console.log(
        `No designs from different designers, fetching same category for design ${designId}`
      );
      candidates = await prisma.design.findMany({
        where: {
          category: currentDesign.category,
          id: { not: designId },
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
              brandLogo: true,
            },
          },
        },
        take: 50,
      });
    }

    // STRATEGY 3: If still no results, fetch any designs in similar price range
    if (candidates.length === 0) {
      console.log(`No same-category designs, fetching by price range for design ${designId}`);
      candidates = await prisma.design.findMany({
        where: {
          price: {
            gte: priceMin,
            lte: priceMax,
          },
          id: { not: designId },
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
              brandLogo: true,
            },
          },
        },
        take: 50,
      });
    }

    // STRATEGY 4: Last resort - fetch any recent designs
    if (candidates.length === 0) {
      console.log(`No designs in price range, fetching recent designs for design ${designId}`);
      candidates = await prisma.design.findMany({
        where: {
          id: { not: designId },
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
              brandLogo: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    }

    // Score each candidate
    const scoredDesigns = candidates.map((design) => {
      let score = 0;

      // Category match (+3 points - highest priority)
      if (design.category === currentDesign.category) {
        score += 3;
      }

      // Different designer (+2 points)
      if (design.designerId !== currentDesign.designerId) {
        score += 2;
      }

      // Price within ±30% range (+2 points)
      if (design.price >= priceMin && design.price <= priceMax) {
        score += 2;
      }

      // Fabric type match (+1 point)
      if (
        design.fabricType &&
        currentDesign.fabricType &&
        design.fabricType.toLowerCase() === currentDesign.fabricType.toLowerCase()
      ) {
        score += 1;
      }

      // Color overlap (+1 point)
      if (design.colors.length > 0 && currentDesign.colors.length > 0) {
        const hasColorOverlap = design.colors.some((color) =>
          currentDesign.colors.some(
            (currentColor) => color.toLowerCase() === currentColor.toLowerCase()
          )
        );
        if (hasColorOverlap) {
          score += 1;
        }
      }

      // Featured designs (+1 point)
      if (design.featured) {
        score += 1;
      }

      return { design, score };
    });

    // Sort by score DESC, then by views DESC
    scoredDesigns.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.design.views - a.design.views;
    });

    // Return top N designs
    const results = scoredDesigns.slice(0, limit).map((item) => item.design);

    console.log(
      `Related designs for ${designId}: ${results.length} found (from ${candidates.length} candidates)`
    );

    return results;
  }

  async getDesigners(
    filters: { search?: string; sortBy?: 'most-designs' | 'newest' | 'a-z' } = {}
  ) {
    const where: any = {
      role: 'DESIGNER',
    };

    // Add search filter
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { brandName: { contains: filters.search, mode: 'insensitive' } },
        { bio: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    let orderBy: any = { designs: { _count: 'desc' } }; // default: most designs
    if (filters.sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (filters.sortBy === 'a-z') {
      orderBy = { brandName: 'asc' };
    }

    const designers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        brandName: true,
        brandLogo: true,
        profileImage: true,
        bio: true,
        _count: {
          select: {
            designs: true,
          },
        },
      },
      orderBy,
    });

    return designers.map((designer) => ({
      id: designer.id,
      fullName: designer.fullName,
      brandName: designer.brandName,
      brandLogo: designer.brandLogo,
      profileImage: designer.profileImage,
      bio: designer.bio,
      designCount: designer._count.designs,
    }));
  }
}

export default new DesignService();
