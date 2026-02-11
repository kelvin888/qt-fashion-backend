import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new custom request
 * POST /api/custom-requests
 */
export const createCustomRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      category,
      referenceImages,
      budget,
      deadline,
      requirements,
      measurements,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !measurements) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, category, measurements',
      });
    }

    // Validate measurements (must have all 8 required fields)
    const requiredMeasurements = [
      'chest',
      'waist',
      'hips',
      'height',
      'shoulder',
      'armLength',
      'inseam',
      'neck',
    ];
    const missingMeasurements = requiredMeasurements.filter((m) => !measurements[m]);
    if (missingMeasurements.length > 0) {
      return res.status(400).json({
        error: `Missing required measurements: ${missingMeasurements.join(', ')}`,
      });
    }

    // Validate deadline (must be at least 6 days: 3 days production + 3 days shipping)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const sixDaysFromNow = new Date();
      sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

      if (deadlineDate < sixDaysFromNow) {
        return res.status(400).json({
          error:
            'Deadline must be at least 6 days from now to allow time for production and shipping',
        });
      }
    }

    const customRequest = await prisma.customRequest.create({
      data: {
        customerId: userId,
        title,
        description,
        category,
        referenceImages: referenceImages || [],
        budget: budget ? parseFloat(budget) : null,
        deadline: deadline ? new Date(deadline) : null,
        requirements,
        measurements,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json(customRequest);
  } catch (error: any) {
    console.error('Error creating custom request:', error);
    res.status(500).json({ error: 'Failed to create custom request' });
  }
};

/**
 * Get all custom requests (for designers to browse)
 * GET /api/custom-requests?status=OPEN&category=WEDDING
 */
export const getAllCustomRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, category, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [requests, total] = await Promise.all([
      prisma.customRequest.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          bids: {
            where: {
              OR: [{ status: 'ACCEPTED' }, ...(userId ? [{ designerId: userId }] : [])],
            },
            select: {
              id: true,
              status: true,
              designerId: true,
            },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.customRequest.count({ where }),
    ]);

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch custom requests' });
  }
};

/**
 * Get customer's own custom requests
 * GET /api/custom-requests/my-requests
 */
export const getMyCustomRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = await prisma.customRequest.findMany({
      where: { customerId: userId },
      include: {
        _count: {
          select: { bids: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching user custom requests:', error);
    res.status(500).json({ error: 'Failed to fetch your custom requests' });
  }
};

/**
 * Get single custom request by ID
 * GET /api/custom-requests/:id
 */
export const getCustomRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customRequest = await prisma.customRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
        bids: {
          include: {
            designer: {
              select: {
                id: true,
                fullName: true,
                brandName: true,
                brandLogo: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    res.json(customRequest);
  } catch (error: any) {
    console.error('Error fetching custom request:', error);
    res.status(500).json({ error: 'Failed to fetch custom request' });
  }
};

/**
 * Update custom request (close, cancel, etc.)
 * PATCH /api/custom-requests/:id
 */
export const updateCustomRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Verify ownership
    const existingRequest = await prisma.customRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (existingRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    const updatedRequest = await prisma.customRequest.update({
      where: { id },
      data: {
        status,
        closedAt: status === 'CLOSED' || status === 'CANCELLED' ? new Date() : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    res.json(updatedRequest);
  } catch (error: any) {
    console.error('Error updating custom request:', error);
    res.status(500).json({ error: 'Failed to update custom request' });
  }
};

/**
 * Submit a bid on a custom request (designers only)
 * POST /api/custom-requests/:id/bids
 */
export const submitBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is a designer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'DESIGNER') {
      return res.status(403).json({ error: 'Only designers can submit bids' });
    }

    const { id: requestId } = req.params;
    const { price, timeline, pitch, portfolioImages, canMeetDeadline, deadlineNotes } = req.body;

    // Validate required fields
    if (!price || !timeline || !pitch) {
      return res.status(400).json({
        error: 'Missing required fields: price, timeline, pitch',
      });
    }

    // Check if request exists and is open
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (customRequest.status !== 'OPEN') {
      return res.status(400).json({ error: 'This request is no longer accepting bids' });
    }

    // Validate timeline as date
    let completionDate: Date;
    try {
      completionDate = new Date(timeline);
      if (isNaN(completionDate.getTime())) {
        return res.status(400).json({ error: 'Invalid completion date format' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid completion date format' });
    }

    // Validate completion date is at least 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    if (completionDate < threeDaysFromNow) {
      return res.status(400).json({
        error: 'Completion date must be at least 3 days from now',
      });
    }

    // Validate completion date allows 3-day shipping buffer before deadline
    if (customRequest.deadline) {
      const requestDeadline = new Date(customRequest.deadline);
      const deliveryDate = new Date(completionDate);
      deliveryDate.setDate(deliveryDate.getDate() + 3); // Add 3 days for shipping

      if (deliveryDate > requestDeadline) {
        const maxCompletionDate = new Date(requestDeadline);
        maxCompletionDate.setDate(maxCompletionDate.getDate() - 3);

        const deadlineStr = requestDeadline.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const maxDateStr = maxCompletionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return res.status(400).json({
          error: `You must complete and ship by ${maxDateStr} to allow 3 days for delivery before the customer's deadline of ${deadlineStr}`,
        });
      }
    }

    // If request has a deadline, designer must explicitly indicate they can meet it
    if (customRequest.deadline && canMeetDeadline === undefined) {
      return res.status(400).json({
        error:
          'This request has a deadline. You must indicate if you can meet it by providing canMeetDeadline field',
      });
    }

    // Check if designer already submitted a bid
    const existingBid = await prisma.customRequestBid.findUnique({
      where: {
        requestId_designerId: {
          requestId,
          designerId: userId,
        },
      },
    });

    if (existingBid) {
      return res.status(400).json({ error: 'You have already submitted a bid for this request' });
    }

    // Create the bid
    const bid = await prisma.customRequestBid.create({
      data: {
        requestId,
        designerId: userId,
        price: parseFloat(price),
        timeline,
        pitch,
        portfolioImages: portfolioImages || [],
        canMeetDeadline: canMeetDeadline ?? null,
        deadlineNotes: deadlineNotes || null,
      },
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json(bid);
  } catch (error: any) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
};

/**
 * Get bids for a custom request
 * GET /api/custom-requests/:id/bids
 */
export const getBidsForRequest = async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;

    // Get the request to check if it has a deadline
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
      select: { deadline: true },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    // If request has a deadline, only show bids where designer can meet it
    const where: any = { requestId };
    if (customRequest.deadline) {
      where.canMeetDeadline = true;
    }

    const bids = await prisma.customRequestBid.findMany({
      where,
      include: {
        designer: {
          select: {
            id: true,
            fullName: true,
            brandName: true,
            brandLogo: true,
            profileImage: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bids);
  } catch (error: any) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
};

/**
 * Accept a bid (customer only)
 * POST /api/custom-requests/:requestId/bids/:bidId/accept
 */
export const acceptBid = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId, bidId } = req.params;

    // Verify the request belongs to the user
    const customRequest = await prisma.customRequest.findUnique({
      where: { id: requestId },
      include: { bids: true },
    });

    if (!customRequest) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (customRequest.customerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept bids for this request' });
    }

    if (customRequest.status !== 'OPEN') {
      return res.status(400).json({ error: 'This request is no longer open' });
    }

    // Verify the bid exists and belongs to this request
    const bid = await prisma.customRequestBid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.requestId !== requestId) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Update in transaction: accept bid, reject others, update request status
    const result = await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      const acceptedBid = await tx.customRequestBid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' },
      });

      // Reject all other bids
      await tx.customRequestBid.updateMany({
        where: {
          requestId,
          id: { not: bidId },
        },
        data: { status: 'REJECTED' },
      });

      // Update request status to IN_PROGRESS and link selected bid
      const updatedRequest = await tx.customRequest.update({
        where: { id: requestId },
        data: {
          status: 'IN_PROGRESS',
          selectedBidId: bidId,
        },
        include: {
          selectedBid: {
            include: {
              designer: {
                select: {
                  id: true,
                  fullName: true,
                  brandName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Create an internal "custom design" + accepted offer so the customer can pay
      // using the existing Offer -> Payment -> Order pipeline.
      const defaultProductionSteps = [
        { id: 'step-1', title: 'Confirm measurements', estimatedTime: '1 day', description: '' },
        { id: 'step-2', title: 'Sourcing materials', estimatedTime: '2 days', description: '' },
        {
          id: 'step-3',
          title: 'Cutting & preparation',
          estimatedTime: '1-2 days',
          description: '',
        },
        { id: 'step-4', title: 'Sewing & assembly', estimatedTime: '3-5 days', description: '' },
        {
          id: 'step-5',
          title: 'Finishing & quality check',
          estimatedTime: '1-2 days',
          description: '',
        },
        {
          id: 'step-6',
          title: 'Packaging & delivery prep',
          estimatedTime: '1 day',
          description: '',
        },
      ];

      const customDesign = await tx.design.create({
        data: {
          designerId: acceptedBid.designerId,
          title: `Custom Order: ${customRequest.title}`,
          description: customRequest.description,
          price: acceptedBid.price,
          images: customRequest.referenceImages || [],
          category: customRequest.category,
          colors: [],
          sizes: [],
          customizable: true,
          productionSteps: defaultProductionSteps as any,
        },
      });

      const offerNotes = `CUSTOM_REQUEST_ID:${customRequest.id}\n${customRequest.description}`;

      const offer = await tx.offer.create({
        data: {
          customerId: customRequest.customerId,
          designerId: acceptedBid.designerId,
          designId: customDesign.id,
          status: 'ACCEPTED',
          customerPrice: acceptedBid.price,
          finalPrice: acceptedBid.price,
          measurements: customRequest.measurements as any,
          notes: offerNotes,
          designerNotes: acceptedBid.pitch,
          acceptedAt: new Date(),
          // Store deadline in offer notes so it can be used when creating order
          deadline: customRequest.deadline,
        },
        include: {
          design: {
            select: {
              id: true,
              title: true,
              images: true,
              category: true,
            },
          },
          designer: {
            select: {
              id: true,
              fullName: true,
              brandName: true,
              email: true,
            },
          },
        },
      });

      return { acceptedBid, updatedRequest, offer };
    });

    // Backwards-compatible response shape: keep top-level fields and also provide
    // a stable wrapper for newer clients.
    res.json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error: any) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
};

/**
 * Get designer's own bids
 * GET /api/custom-requests/my-bids
 */
export const getMyBids = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bids = await prisma.customRequestBid.findMany({
      where: { designerId: userId },
      include: {
        request: {
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bids);
  } catch (error: any) {
    console.error('Error fetching designer bids:', error);
    res.status(500).json({ error: 'Failed to fetch your bids' });
  }
};
