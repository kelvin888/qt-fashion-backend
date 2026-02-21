/**
 * Admin Routes
 * Protected routes for platform administration (admin role only)
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/admin/settings.controller';
import * as feesController from '../controllers/admin/fees.controller';
import { createAdmin } from '../controllers/auth.controller';

const router = express.Router();

// ========================================
// ADMIN CREATION (NO AUTH REQUIRED)
// ========================================

/**
 * POST /api/admin/create
 * Create first admin user (requires Admin-Creation-Secret)
 * This route is NOT protected by auth middleware
 */
router.post('/create', createAdmin);

// All other admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// ========================================
// PLATFORM SETTINGS ROUTES
// ========================================

/**
 * GET /api/admin/settings
 * Get all platform settings
 */
router.get('/settings', settingsController.getAllSettings);

/**
 * PUT /api/admin/settings/:key
 * Update a specific setting
 */
router.put('/settings/:key', settingsController.updateSetting);

/**
 * GET /api/admin/audit/settings
 * Get settings change audit history
 */
router.get('/audit/settings', settingsController.getAuditHistory);

// ========================================
// FEE TIER ROUTES
// ========================================

/**
 * GET /api/admin/fees/tiers
 * List all fee tiers
 */
router.get('/fees/tiers', feesController.listFeeTiers);

/**
 * POST /api/admin/fees/tiers
 * Create a new fee tier
 */
router.post('/fees/tiers', feesController.createFeeTier);

/**
 * PUT /api/admin/fees/tiers/:id
 * Update a fee tier
 */
router.put('/fees/tiers/:id', feesController.updateFeeTier);

/**
 * DELETE /api/admin/fees/tiers/:id
 * Delete (deactivate) a fee tier
 */
router.delete('/fees/tiers/:id', feesController.deleteFeeTier);

// ========================================
// DESIGNER OVERRIDE ROUTES
// ========================================

/**
 * GET /api/admin/fees/overrides
 * List all designer fee overrides
 */
router.get('/fees/overrides', feesController.listDesignerOverrides);

/**
 * POST /api/admin/fees/overrides
 * Create a designer fee override
 */
router.post('/fees/overrides', feesController.createDesignerOverride);

/**
 * DELETE /api/admin/fees/overrides/:id
 * Delete a designer override
 */
router.delete('/fees/overrides/:id', feesController.deleteDesignerOverride);

// ========================================
// PROMOTIONAL PERIOD ROUTES
// ========================================

/**
 * GET /api/admin/fees/promotions
 * List all promotional periods
 */
router.get('/fees/promotions', feesController.listPromotionalPeriods);

/**
 * POST /api/admin/fees/promotions
 * Create a promotional period
 */
router.post('/fees/promotions', feesController.createPromotionalPeriod);

/**
 * PUT /api/admin/fees/promotions/:id/toggle
 * Toggle promotional period active status
 */
router.put('/fees/promotions/:id/toggle', feesController.togglePromotionalPeriod);

// ========================================
// ANALYTICS ROUTES
// ========================================

/**
 * GET /api/admin/analytics/revenue
 * Get fee revenue analytics
 */
router.get('/analytics/revenue', feesController.getFeeAnalytics);

export default router;
