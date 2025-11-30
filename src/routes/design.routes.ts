import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createDesign,
  getDesigns,
  getDesignById,
  updateDesign,
  deleteDesign,
  getMyDesigns,
} from '../controllers/design.controller';

const router = Router();

/**
 * Public routes
 */
// Get all designs (with filters)
router.get('/', getDesigns);

// Get single design by ID
router.get('/:id', getDesignById);

/**
 * Designer-only routes
 */
// Get my designs (requires authentication)
router.get('/my/designs', authenticate, authorize('DESIGNER'), getMyDesigns);

// Create new design
router.post('/', authenticate, authorize('DESIGNER'), upload.array('images', 5), createDesign);

// Update design
router.put('/:id', authenticate, authorize('DESIGNER'), upload.array('images', 5), updateDesign);

// Delete design (soft delete)
router.delete('/:id', authenticate, authorize('DESIGNER'), deleteDesign);

export default router;
