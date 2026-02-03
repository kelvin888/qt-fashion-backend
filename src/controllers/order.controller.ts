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

    const order = await orderService.addShipment(orderId, userId, {
      carrier,
      trackingNumber,
      estimatedDelivery: new Date(estimatedDelivery),
    });

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
