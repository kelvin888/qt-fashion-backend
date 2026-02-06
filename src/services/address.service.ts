import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateAddressData {
  userId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault?: boolean;
}

interface UpdateAddressData {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export class AddressService {
  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // Default address first
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a single address by ID
   */
  async getAddressById(addressId: string, userId: string) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    if (address.userId !== userId) {
      throw new Error('Unauthorized: Not your address');
    }

    return address;
  }

  /**
   * Get default address for a user
   */
  async getDefaultAddress(userId: string) {
    return await prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  /**
   * Create a new address
   */
  async createAddress(data: CreateAddressData) {
    const { userId, isDefault, ...addressData } = data;

    // If this is the first address or explicitly set as default, make it default
    const existingAddresses = await prisma.address.findMany({
      where: { userId },
    });

    const shouldBeDefault = isDefault || existingAddresses.length === 0;

    // If setting as default, unset all other defaults first
    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return await prisma.address.create({
      data: {
        ...addressData,
        userId,
        isDefault: shouldBeDefault,
      },
    });
  }

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, userId: string, data: UpdateAddressData) {
    // Verify ownership
    const address = await this.getAddressById(addressId, userId);

    const { isDefault, ...updateData } = data;

    // If setting as default, unset all other defaults first
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: addressId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return await prisma.address.update({
      where: { id: addressId },
      data: {
        ...updateData,
        ...(isDefault !== undefined && { isDefault }),
      },
    });
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(addressId: string, userId: string) {
    // Verify ownership
    await this.getAddressById(addressId, userId);

    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Unset all defaults for this user
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Set the specified address as default
      return await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string, userId: string) {
    // Verify ownership
    const address = await this.getAddressById(addressId, userId);

    // Check if this address is used in any orders
    const ordersWithAddress = await prisma.order.findMany({
      where: { shippingAddressId: addressId },
      take: 1,
    });

    if (ordersWithAddress.length > 0) {
      throw new Error('Cannot delete address that is used in existing orders');
    }

    // If deleting the default address, set another one as default
    if (address.isDefault) {
      const otherAddresses = await prisma.address.findMany({
        where: {
          userId,
          id: { not: addressId },
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      });

      if (otherAddresses.length > 0) {
        await prisma.address.update({
          where: { id: otherAddresses[0].id },
          data: { isDefault: true },
        });
      }
    }

    return await prisma.address.delete({
      where: { id: addressId },
    });
  }

  /**
   * Validate address data
   */
  validateAddressData(data: Partial<CreateAddressData>): string[] {
    const errors: string[] = [];

    if (data.addressLine1 !== undefined && !data.addressLine1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (data.city !== undefined && !data.city?.trim()) {
      errors.push('City is required');
    }

    if (data.state !== undefined && !data.state?.trim()) {
      errors.push('State is required');
    }

    if (data.country !== undefined && !data.country?.trim()) {
      errors.push('Country is required');
    }

    if (data.postalCode !== undefined && !data.postalCode?.trim()) {
      errors.push('Postal code is required');
    }

    return errors;
  }
}

export const addressService = new AddressService();
