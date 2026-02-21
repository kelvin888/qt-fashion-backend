/**
 * Admin Events Controller
 * Handles Server-Sent Events (SSE) streaming endpoint
 */

import { Request, Response, NextFunction } from 'express';
import adminEventsService from '../../services/admin-events.service';

/**
 * Stream real-time events to admin clients via SSE
 * GET /api/admin/events
 */
export const streamEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Add client to active connections
    const clientId = adminEventsService.addClient(res, adminId);

    // Handle client disconnect
    req.on('close', () => {
      adminEventsService.removeClient(clientId);
      res.end();
    });

    // Handle errors
    res.on('error', (error) => {
      console.error('SSE connection error:', error);
      adminEventsService.removeClient(clientId);
    });
  } catch (error: any) {
    console.error('Error establishing SSE connection:', error);
    next(error);
  }
};

/**
 * Get active SSE connections count
 * GET /api/admin/events/status
 */
export const getConnectionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeConnections = adminEventsService.getActiveClientsCount();

    res.status(200).json({
      success: true,
      data: {
        activeConnections,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    next(error);
  }
};
