/**
 * Body Measurement Standards
 * Based on ISO 8559-1:2017 - Size designation of clothes
 * Part 1: Anthropometric definitions for body measurement
 *
 * Reference: International Standard for garment construction and anthropometric surveys
 * Validation ranges based on WHO/CDC anthropometric data for adults (18-75 years)
 */

import { Gender } from '@prisma/client';

interface MeasurementRange {
  min: number;
  max: number;
  typical: { min: number; max: number };
}

interface MeasurementStandard {
  ranges: {
    MALE: MeasurementRange;
    FEMALE: MeasurementRange;
    OTHER: MeasurementRange;
    PREFER_NOT_TO_SAY: MeasurementRange;
  };
}

/**
 * ISO 8559-1:2017 Measurement Standards
 * All measurements in centimeters (cm)
 */
export const MEASUREMENT_STANDARDS: Record<string, MeasurementStandard> = {
  height: {
    ranges: {
      MALE: { min: 145, max: 210, typical: { min: 165, max: 185 } },
      FEMALE: { min: 140, max: 200, typical: { min: 155, max: 175 } },
      OTHER: { min: 140, max: 210, typical: { min: 155, max: 185 } },
      PREFER_NOT_TO_SAY: { min: 140, max: 210, typical: { min: 155, max: 185 } },
    },
  },

  chest: {
    ranges: {
      MALE: { min: 75, max: 150, typical: { min: 90, max: 115 } },
      FEMALE: { min: 70, max: 145, typical: { min: 80, max: 105 } },
      OTHER: { min: 70, max: 150, typical: { min: 80, max: 115 } },
      PREFER_NOT_TO_SAY: { min: 70, max: 150, typical: { min: 80, max: 115 } },
    },
  },

  bust: {
    ranges: {
      MALE: { min: 70, max: 145, typical: { min: 80, max: 105 } },
      FEMALE: { min: 70, max: 160, typical: { min: 80, max: 110 } },
      OTHER: { min: 70, max: 160, typical: { min: 80, max: 110 } },
      PREFER_NOT_TO_SAY: { min: 70, max: 160, typical: { min: 80, max: 110 } },
    },
  },

  underbust: {
    ranges: {
      MALE: { min: 60, max: 125, typical: { min: 70, max: 95 } },
      FEMALE: { min: 60, max: 130, typical: { min: 68, max: 90 } },
      OTHER: { min: 60, max: 130, typical: { min: 68, max: 95 } },
      PREFER_NOT_TO_SAY: { min: 60, max: 130, typical: { min: 68, max: 95 } },
    },
  },

  waist: {
    ranges: {
      MALE: { min: 60, max: 160, typical: { min: 75, max: 100 } },
      FEMALE: { min: 50, max: 140, typical: { min: 60, max: 85 } },
      OTHER: { min: 50, max: 160, typical: { min: 60, max: 100 } },
      PREFER_NOT_TO_SAY: { min: 50, max: 160, typical: { min: 60, max: 100 } },
    },
  },

  hips: {
    ranges: {
      MALE: { min: 75, max: 145, typical: { min: 90, max: 110 } },
      FEMALE: { min: 70, max: 170, typical: { min: 85, max: 115 } },
      OTHER: { min: 70, max: 170, typical: { min: 85, max: 115 } },
      PREFER_NOT_TO_SAY: { min: 70, max: 170, typical: { min: 85, max: 115 } },
    },
  },

  shoulder: {
    ranges: {
      MALE: { min: 35, max: 60, typical: { min: 42, max: 50 } },
      FEMALE: { min: 30, max: 55, typical: { min: 36, max: 44 } },
      OTHER: { min: 30, max: 60, typical: { min: 36, max: 50 } },
      PREFER_NOT_TO_SAY: { min: 30, max: 60, typical: { min: 36, max: 50 } },
    },
  },

  armLength: {
    ranges: {
      MALE: { min: 50, max: 80, typical: { min: 58, max: 68 } },
      FEMALE: { min: 45, max: 75, typical: { min: 53, max: 63 } },
      OTHER: { min: 45, max: 80, typical: { min: 53, max: 68 } },
      PREFER_NOT_TO_SAY: { min: 45, max: 80, typical: { min: 53, max: 68 } },
    },
  },

  inseam: {
    ranges: {
      MALE: { min: 60, max: 100, typical: { min: 75, max: 85 } },
      FEMALE: { min: 55, max: 95, typical: { min: 70, max: 80 } },
      OTHER: { min: 55, max: 100, typical: { min: 70, max: 85 } },
      PREFER_NOT_TO_SAY: { min: 55, max: 100, typical: { min: 70, max: 85 } },
    },
  },

  neck: {
    ranges: {
      MALE: { min: 30, max: 55, typical: { min: 36, max: 44 } },
      FEMALE: { min: 25, max: 50, typical: { min: 30, max: 38 } },
      OTHER: { min: 25, max: 55, typical: { min: 30, max: 44 } },
      PREFER_NOT_TO_SAY: { min: 25, max: 55, typical: { min: 30, max: 44 } },
    },
  },
};

/**
 * Validate measurement value against ISO standards
 */
export function validateMeasurement(
  key: string,
  value: number,
  gender: Gender
): { isValid: boolean; message?: string } {
  const standard = MEASUREMENT_STANDARDS[key];

  if (!standard) {
    return { isValid: true }; // Unknown measurement, skip validation
  }

  const range = standard.ranges[gender];

  if (value < range.min || value > range.max) {
    return {
      isValid: false,
      message: `${key} should be between ${range.min}-${range.max} cm for ${gender.toLowerCase()}`,
    };
  }

  return { isValid: true };
}

/**
 * Get required torso measurements based on gender
 */
export function getRequiredTorsoMeasurements(gender: Gender): string[] {
  if (gender === 'MALE') {
    return ['chest'];
  } else if (gender === 'FEMALE') {
    return ['bust', 'underbust'];
  } else {
    // For OTHER or PREFER_NOT_TO_SAY, accept either
    return []; // Will be handled separately
  }
}
