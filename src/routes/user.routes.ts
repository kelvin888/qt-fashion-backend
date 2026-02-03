import { Router } from 'express';
import { getUserById, getDesignerProfile } from '../controllers/user.controller';

const router = Router();

// Public routes - anyone can view user profiles
router.get('/:id', getUserById);
router.get('/:id/designer-profile', getDesignerProfile);

export default router;
