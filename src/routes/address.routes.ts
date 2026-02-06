import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../controllers/address.controller';

const router = Router();

/**
 * @route   GET /api/addresses/:userId
 * @desc    Get all addresses for a user
 * @access  Private
 */
router.get('/:userId', authenticate, getUserAddresses);

/**
 * @route   GET /api/addresses/:userId/:addressId
 * @desc    Get a single address by ID
 * @access  Private
 */
router.get('/:userId/:addressId', authenticate, getAddressById);

/**
 * @route   POST /api/addresses/:userId
 * @desc    Create a new address
 * @access  Private
 */
router.post('/:userId', authenticate, createAddress);

/**
 * @route   PUT /api/addresses/:userId/:addressId
 * @desc    Update an existing address
 * @access  Private
 */
router.put('/:userId/:addressId', authenticate, updateAddress);

/**
 * @route   PATCH /api/addresses/:userId/:addressId/set-default
 * @desc    Set an address as default
 * @access  Private
 */
router.patch('/:userId/:addressId/set-default', authenticate, setDefaultAddress);

/**
 * @route   DELETE /api/addresses/:userId/:addressId
 * @desc    Delete an address
 * @access  Private
 */
router.delete('/:userId/:addressId', authenticate, deleteAddress);

export default router;
