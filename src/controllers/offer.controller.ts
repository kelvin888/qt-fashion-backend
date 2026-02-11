import { Request, Response, NextFunction } from 'express';
import offerService from '../services/offer.service';

export const createOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔵 [CREATE OFFER] Received request body:', JSON.stringify(req.body, null, 2));
    const { designId, customerPrice, measurements, notes, expiresAt, tryOnImageUrl, deadline } =
      req.body;

    console.log('🔵 [CREATE OFFER] Extracted measurements:', measurements);
    console.log('🔵 [CREATE OFFER] measurements type:', typeof measurements);
    console.log('🔵 [CREATE OFFER] measurements is null?', measurements === null);
    console.log('🔵 [CREATE OFFER] measurements is undefined?', measurements === undefined);
    console.log('🔵 [CREATE OFFER] tryOnImageUrl:', tryOnImageUrl);

    // Validation
    if (!designId || !customerPrice) {
      return res.status(400).json({
        message: 'Missing required fields: designId, customerPrice',
      });
    }

    // Validate deadline (must be at least 3 days in the future if provided)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      if (deadlineDate < threeDaysFromNow) {
        return res.status(400).json({
          message: 'Deadline must be at least 3 days from now',
        });
      }
    }

    // Get design to find designerId
    const offer = await offerService.createOffer({
      customerId: req.user!.id,
      designerId: '', // Will be set by service from design
      designId,
      customerPrice: parseFloat(customerPrice),
      measurements,
      notes,
      tryOnImageUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
    });

    console.log('🔵 [CREATE OFFER] Created offer with measurements:', offer.measurements);
    res.status(201).json(offer);
  } catch (error: any) {
    console.error('❌ [CREATE OFFER] Error:', error);
    next(error);
  }
};

export const getOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offers = await offerService.getOffers(req.user!.id, req.user!.role);

    res.status(200).json(offers);
  } catch (error: any) {
    next(error);
  }
};

export const getOfferById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const offer = await offerService.getOfferById(id, req.user!.id);

    res.status(200).json(offer);
  } catch (error: any) {
    next(error);
  }
};

export const acceptOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const offer = await offerService.acceptOffer(id, req.user!.id);

    res.status(200).json(offer);
  } catch (error: any) {
    next(error);
  }
};

export const counterOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { designerPrice, designerNotes } = req.body;

    if (!designerPrice) {
      return res.status(400).json({
        message: 'Missing required field: designerPrice',
      });
    }

    const offer = await offerService.counterOffer(id, req.user!.id, {
      designerPrice: parseFloat(designerPrice),
      designerNotes,
    });

    res.status(200).json(offer);
  } catch (error: any) {
    next(error);
  }
};

export const rejectOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { designerNotes } = req.body;

    const offer = await offerService.rejectOffer(id, req.user!.id, designerNotes);

    res.status(200).json(offer);
  } catch (error: any) {
    next(error);
  }
};

export const withdrawOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const offer = await offerService.withdrawOffer(id, req.user!.id);

    res.status(200).json(offer);
  } catch (error: any) {
    next(error);
  }
};

export const getOfferMeasurements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const measurements = await offerService.getOfferMeasurements(id, req.user!.id);

    res.status(200).json({
      success: true,
      measurements,
    });
  } catch (error: any) {
    next(error);
  }
};
