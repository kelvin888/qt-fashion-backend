/**
 * Email validation utility for backend
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email address format
 * @param email - The email address to validate
 * @returns true if email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();

  // Basic format check
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }

  // Additional checks
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  // Local part (before @) shouldn't be empty or too long
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Domain part shouldn't be empty or too long
  if (domain.length === 0 || domain.length > 255) {
    return false;
  }

  // Domain should have at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  // Check for valid TLD (at least 2 characters after last dot)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return false;
  }

  return true;
};

/**
 * Validates and normalizes email address
 * @param email - The email address to validate and normalize
 * @returns Normalized email address
 * @throws Error if email is invalid
 */
export const validateAndNormalizeEmail = (email: string): string => {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email address format');
  }

  return email.trim().toLowerCase();
};
