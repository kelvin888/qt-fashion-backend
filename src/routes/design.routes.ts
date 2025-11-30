import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// TODO: Implement design routes
router.get('/', (req, res) => {
  res.json({ message: 'Design routes - coming soon' });
});

router.post('/', authenticate, authorize('DESIGNER'), upload.array('images', 5), (req, res) => {
  res.json({ message: 'Create design - coming soon' });
});

export default router;
