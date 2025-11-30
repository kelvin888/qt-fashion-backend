import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Implement order routes
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Order routes - coming soon' });
});

router.post('/', authenticate, (req, res) => {
  res.json({ message: 'Create order - coming soon' });
});

export default router;
