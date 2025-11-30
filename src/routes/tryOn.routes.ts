import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Implement virtual try-on routes
router.post('/', authenticate, (req, res) => {
  res.json({ message: 'Virtual try-on routes - coming soon' });
});

export default router;
