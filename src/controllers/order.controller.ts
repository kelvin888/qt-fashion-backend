/**
 * Order Controller
 *
 * HTTP request handlers for order endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import orderService from '../services/order.service';

/**
 * Get all orders for authenticated user
 */
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const orders = await orderService.getOrders(userId, userRole);
    res.status(200).json(orders);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get single order by ID
 */
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;

    const order = await orderService.getOrderById(orderId, userId);
    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update order status (designer only)
 */
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { status, progressNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await orderService.updateOrderStatus(orderId, userId, {
      status,
      progressNotes,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update production progress (designer only)
 */
export const updateProduction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { productionSteps, progressNotes } = req.body;

    const order = await orderService.updateProduction(orderId, userId, {
      productionSteps,
      progressNotes,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update single production step (designer only)
 */
export const updateProductionStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, stepId } = req.params;
    const userId = req.user!.id;
    const { status, completedAt, notes } = req.body;

    const order = await orderService.updateProductionStep(orderId, userId, stepId, {
      status,
      completedAt,
      notes,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Add shipment tracking (designer only)
 */
export const addShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { carrier, trackingNumber, estimatedDelivery } = req.body;

    if (!carrier || !trackingNumber || !estimatedDelivery) {
      return res.status(400).json({
        error: 'Carrier, tracking number, and estimated delivery are required',
      });
    }

    // Parse and validate the date
    const deliveryDate = new Date(estimatedDelivery);
    if (isNaN(deliveryDate.getTime())) {
      return res.status(400).json({
        error:
          'Invalid date format. Please provide a valid date (e.g., 2026-02-15 or Feb 15, 2026)',
      });
    }

    const order = await orderService.addShipment(orderId, userId, {
      carrier,
      trackingNumber,
      estimatedDelivery: deliveryDate,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Confirm delivery (customer only) - LEGACY
 */
export const confirmDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { rating, review } = req.body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
    }

    const order = await orderService.confirmDelivery(orderId, userId, {
      rating,
      review,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Confirm receipt (customer only) - NEW ESCROW FLOW
 * Customer confirms they received the item - releases payment immediately
 */
export const confirmReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { rating, review } = req.body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
    }

    const order = await orderService.confirmReceipt(orderId, userId, {
      rating,
      review,
    });

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Open dispute (customer only)
 * Customer reports an issue with the order
 */
export const openDispute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        error: 'Please provide a detailed reason for the dispute (at least 10 characters)',
      });
    }

    const order = await orderService.openDispute(orderId, userId, reason);

    res.status(200).json(order);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get designer order statistics
 */
export const getDesignerStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const stats = await orderService.getDesignerStats(userId);
    res.status(200).json(stats);
  } catch (error: any) {
    next(error);
  }
};
