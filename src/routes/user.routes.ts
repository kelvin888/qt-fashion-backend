import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Implement user routes
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'User routes - coming soon' });
});

export default router;
