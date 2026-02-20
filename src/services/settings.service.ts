/**
 * Settings Service
 * Manages platform-wide configuration settings
 */

import prisma from '../config/database';
import { PlatformSettings, SettingsAuditLog } from '@prisma/client';

class SettingsService {
  /**
   * Get a setting value with type safety
   */
  async getSetting<T = string>(key: string, defaultValue?: T): Promise<T> {
    try {
      const setting = await prisma.platformSettings.findUnique({
        where: { key },
      });

      if (!setting) {
        return defaultValue as T;
      }

      return this.parseValue<T>(setting.value, setting.dataType);
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return defaultValue as T;
    }
  }

  /**
   * Get all settings, optionally filtered by category
   */
  async getAllSettings(category?: string): Promise<PlatformSettings[]> {
    return prisma.platformSettings.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Update a setting and create audit log
   */
  async updateSetting(
    key: string,
    value: any,
    adminId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<PlatformSettings> {
    // Get current value for audit trail
    const existingSetting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // Update or create setting
    const setting = await prisma.platformSettings.upsert({
      where: { key },
      update: {
        value: stringValue,
        updatedBy: adminId,
      },
      create: {
        key,
        value: stringValue,
        dataType: this.inferType(value),
        updatedBy: adminId,
      },
    });

    // Create audit log
    await prisma.settingsAuditLog.create({
      data: {
        settingKey: key,
        settingId: setting.id,
        oldValue: existingSetting?.value || null,
        newValue: stringValue,
        changedBy: adminId,
        reason,
        ipAddress,
      },
    });

    console.log(`⚙️  Setting updated: ${key} = ${stringValue} (by admin ${adminId})`);
    return setting;
  }

  /**
   * Get platform fee percentage (most commonly used setting)
   */
  async getPlatformFee(): Promise<number> {
    return this.getSetting<number>('platform_fee_percentage', 0.1);
  }

  /**
   * Get audit history for a setting
   */
  async getSettingAuditHistory(
    settingKey?: string,
    limit: number = 50
  ): Promise<SettingsAuditLog[]> {
    return prisma.settingsAuditLog.findMany({
      where: settingKey ? { settingKey } : undefined,
      include: {
        changedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Parse value based on data type
   */
  private parseValue<T>(value: string, dataType: string): T {
    switch (dataType) {
      case 'number':
        return parseFloat(value) as T;
      case 'boolean':
        return (value === 'true') as T;
      case 'json':
        return JSON.parse(value) as T;
      default:
        return value as T;
    }
  }

  /**
   * Infer data type from value
   */
  private inferType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }
}

export default new SettingsService();
