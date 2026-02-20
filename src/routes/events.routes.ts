import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { realtimeEventService } from '../services/realtime-event.service';

const router = Router();

router.get('/stream', authenticate, (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  realtimeEventService.subscribe(userId, res);
});

export default router;
