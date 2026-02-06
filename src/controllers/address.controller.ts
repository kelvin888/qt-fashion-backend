import { Request, Response } from 'express';
import { addressService } from '../services/address.service';

/**
 * Get all addresses for the authenticated user
 * GET /api/users/:userId/addresses
 */
export const getUserAddresses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUserId = req.user?.id;

    // Ensure user can only access their own addresses
    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other user addresses' });
    }

    const addresses = await addressService.getUserAddresses(userId);

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch addresses' });
  }
};

/**
 * Get a single address by ID
 * GET /api/users/:userId/addresses/:addressId
 */
export const getAddressById = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const authUserId = req.user?.id;

    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const address = await addressService.getAddressById(addressId, userId);

    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (error: any) {
    console.error('Error fetching address:', error);
    res.status(404).json({ error: error.message || 'Address not found' });
  }
};

/**
 * Create a new address
 * POST /api/users/:userId/addresses
 */
export const createAddress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUserId = req.user?.id;

    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { addressLine1, addressLine2, city, state, country, postalCode, isDefault } = req.body;

    // Validate required fields
    const errors = addressService.validateAddressData({
      addressLine1,
      city,
      state,
      country,
      postalCode,
    });

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    const address = await addressService.createAddress({
      userId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      isDefault,
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address,
    });
  } catch (error: any) {
    console.error('Error creating address:', error);
    res.status(500).json({ error: error.message || 'Failed to create address' });
  }
};

/**
 * Update an existing address
 * PUT /api/users/:userId/addresses/:addressId
 */
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const authUserId = req.user?.id;

    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { addressLine1, addressLine2, city, state, country, postalCode, isDefault } = req.body;

    // Validate fields if provided
    const errors = addressService.validateAddressData({
      addressLine1,
      city,
      state,
      country,
      postalCode,
    });

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    const address = await addressService.updateAddress(addressId, userId, {
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      isDefault,
    });

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error: any) {
    console.error('Error updating address:', error);
    res.status(400).json({ error: error.message || 'Failed to update address' });
  }
};

/**
 * Set an address as default
 * PATCH /api/users/:userId/addresses/:addressId/set-default
 */
export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const authUserId = req.user?.id;

    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const address = await addressService.setDefaultAddress(addressId, userId);

    res.status(200).json({
      success: true,
      message: 'Default address set successfully',
      data: address,
    });
  } catch (error: any) {
    console.error('Error setting default address:', error);
    res.status(400).json({ error: error.message || 'Failed to set default address' });
  }
};

/**
 * Delete an address
 * DELETE /api/users/:userId/addresses/:addressId
 */
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const authUserId = req.user?.id;

    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await addressService.deleteAddress(addressId, userId);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    res.status(400).json({ error: error.message || 'Failed to delete address' });
  }
};
