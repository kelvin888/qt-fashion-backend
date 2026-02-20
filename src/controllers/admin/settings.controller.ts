/**
 * Admin Settings Controller
 * Handles platform settings management (admin only)
 */

import { Request, Response, NextFunction } from 'express';
import settingsService from '../../services/settings.service';

/**
 * Get all platform settings
 */
export const getAllSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const settings = await settingsService.getAllSettings(category as string);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Update a specific setting
 */
export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value, reason } = req.body;
    const adminId = req.user!.id;
    const ipAddress = req.ip;

    // Validate setting key and value
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setting key and value are required',
      });
    }

    // Additional validation for specific settings
    if (key === 'platform_fee_percentage') {
      const feeValue = parseFloat(value);
      if (isNaN(feeValue) || feeValue < 0 || feeValue > 1) {
        return res.status(400).json({
          success: false,
          message: 'Platform fee must be between 0 and 1 (0% - 100%)',
        });
      }
    }

    const setting = await settingsService.updateSetting(
      key,
      value,
      adminId,
      reason,
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: setting,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get audit history for settings changes
 */
export const getAuditHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settingKey, limit } = req.query;
    const parsedLimit = limit ? parseInt(limit as string) : 50;

    const history = await settingsService.getSettingAuditHistory(
      settingKey as string,
      parsedLimit
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    next(error);
  }
};
