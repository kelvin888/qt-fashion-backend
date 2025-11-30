import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// TODO: Implement measurement routes
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
  ]),
  (req, res) => {
    res.json({ message: 'Measurement routes - coming soon' });
  }
);

export default router;
