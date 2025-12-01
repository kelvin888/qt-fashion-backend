import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createMeasurement,
  getMeasurements,
  getActiveMeasurement,
  updateMeasurement,
  deleteMeasurement,
  setActiveMeasurement,
} from '../controllers/measurement.controller';

const router = Router();

// Create new measurement with photo upload and AI extraction
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
  ]),
  createMeasurement
);

// Get all measurements for the authenticated user
router.get('/', authenticate, getMeasurements);

// Get active measurement for the authenticated user
router.get('/active', authenticate, getActiveMeasurement);

// Update measurement
router.put(
  '/:id',
  authenticate,
  upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
  ]),
  updateMeasurement
);

// Delete measurement
router.delete('/:id', authenticate, deleteMeasurement);

// Set active measurement
router.patch('/:id/activate', authenticate, setActiveMeasurement);

export default router;
