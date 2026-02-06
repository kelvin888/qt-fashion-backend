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

const router = Router({ mergeParams: true }); // mergeParams to access :userId from parent router

/**
 * @route   GET /api/users/:userId/addresses
 * @desc    Get all addresses for a user
 * @access  Private
 */
router.get('/', authenticate, getUserAddresses);

/**
 * @route   GET /api/users/:userId/addresses/:addressId
 * @desc    Get a single address by ID
 * @access  Private
 */
router.get('/:addressId', authenticate, getAddressById);

/**
 * @route   POST /api/users/:userId/addresses
 * @desc    Create a new address
 * @access  Private
 */
router.post('/', authenticate, createAddress);

/**
 * @route   PUT /api/users/:userId/addresses/:addressId
 * @desc    Update an existing address
 * @access  Private
 */
router.put('/:addressId', authenticate, updateAddress);

/**
 * @route   PATCH /api/users/:userId/addresses/:addressId/set-default
 * @desc    Set an address as default
 * @access  Private
 */
router.patch('/:addressId/set-default', authenticate, setDefaultAddress);

/**
 * @route   DELETE /api/users/:userId/addresses/:addressId
 * @desc    Delete an address
 * @access  Private
 */
router.delete('/:addressId', authenticate, deleteAddress);

export default router;
