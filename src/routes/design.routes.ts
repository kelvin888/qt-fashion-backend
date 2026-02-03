import { Router } from 'express';
import * as designController from '../controllers/design.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public routes - anyone can browse designs
router.get('/', designController.getDesigns);
router.get('/:id', designController.getDesignById);

// Protected routes - designers only
router.post('/', authenticate, requireRole('DESIGNER'), designController.createDesign);
router.put('/:id', authenticate, requireRole('DESIGNER'), designController.updateDesign);
router.delete('/:id', authenticate, requireRole('DESIGNER'), designController.deleteDesign);

export default router;
