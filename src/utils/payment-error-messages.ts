/**
 * Interswitch Payment Gateway Response Code Mappings
 * Maps response codes to user-friendly error messages
 */

export const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  // Success codes
  '00': 'Payment successful',
  '10': 'Payment approved (partial)',
  '11': 'Payment approved',

  // Pending/In Progress
  '09': 'Transaction in progress',

  // Cancellation
  Z6: 'Payment cancelled',
  '17': 'Payment cancelled by customer',

  // Insufficient funds
  '51': 'Insufficient funds in your account',

  // Card issues
  '14': 'Invalid card number',
  '33': 'Card has expired, please use another card',
  '54': 'Your card has expired',
  '41': 'Lost card, please contact your bank',
  '43': 'Stolen card, please contact your bank',
  '56': 'Card not found, please check card details',

  // PIN/Security issues
  '38': 'Incorrect PIN tries exceeded',
  '55': 'Incorrect PIN entered',
  '63': 'Security violation detected',
  '75': 'Incorrect PIN tries exceeded',

  // Transaction restrictions
  '57': 'Transaction not permitted for this card',
  '58': 'Transaction not permitted on this terminal',
  '59': 'Suspected fraud, please contact your bank',
  '61': 'Amount exceeds withdrawal limit',
  '62': 'Restricted card, please contact your bank',
  '65': 'Withdrawal frequency exceeded',
  '98': 'Exceeds cash limit',
  X03: 'Amount exceeds maximum allowed',
  X04: 'Amount below minimum required',
  X05: 'Amount exceeds limit permitted by your bank',

  // Bank/System issues
  '01': 'Please contact your bank',
  '03': 'Invalid merchant configuration',
  '05': 'Transaction declined by bank',
  '06': 'System error occurred',
  '12': 'Invalid transaction',
  '13': 'Invalid amount',
  '15': 'Bank not found',
  '19': 'Please re-enter transaction',
  '20': 'Invalid response from bank',
  '21': 'No action taken by bank',
  '22': 'System malfunction detected',
  '30': 'Format error occurred',
  '31': 'Bank not supported',
  '40': 'Function not supported',
  '60': 'Please contact your bank',
  '68': 'Response received too late',
  '91': 'Bank or system temporarily unavailable',
  '92': 'Routing error occurred',
  '96': 'System malfunction',

  // Duplicate/Reference errors
  '94': 'Duplicate transaction detected',
  Z5: 'This transaction reference has already been used',
  Z25: 'Transaction not found',

  // Timeout/Expiration
  XS1: 'Transaction time expired',
  Z0: 'Transaction not completed',
  Z1: 'Transaction error occurred',

  // Account issues
  '39': 'No credit account found',
  '42': 'No account found',
  '48': 'No customer record found',
  '52': 'No checking account found',
  '53': 'No savings account found',
  Z2: 'Bank account error',
  Z3: 'Bank collections account error',

  // 3D Secure/OTP issues
  M0: 'Cardholder not enrolled for OTP',
  T0: 'Payment requires authentication',
  T1: 'No response received for authentication',
  Z61: 'Payment requires token',
  Z62: 'Token generation successful',
  Z63: 'Customer not registered on token platform',
  Z64: 'Could not generate token',
  Z65: 'Payment requires token authorization',
  Z66: 'Token authorization successful',
  Z67: 'Incorrect token supplied',
  Z68: 'Could not authenticate token',
  Z69: 'Customer cancelled secure authentication',

  // Integration errors
  Z4: 'Integration error occurred',
  Z7: 'Transaction pre-processing error',
  Z8: 'Invalid card number',
  XGO: 'Cannot retrieve collections account',

  // Rate limiting
  Z162: 'Transaction rate limit exceeded',

  // HTTP/API errors
  '10400': 'Bad request - please try again',
  '10403': 'Request forbidden',
  '10500': 'Server error - please try again',

  // General fallback
  DEFAULT: 'Payment failed. Please try again or contact support',
};

/**
 * Get user-friendly error message for response code
 */
export function getPaymentErrorMessage(responseCode: string): string {
  return PAYMENT_ERROR_MESSAGES[responseCode] || PAYMENT_ERROR_MESSAGES['DEFAULT'];
}

/**
 * Check if response code indicates successful payment
 */
export function isPaymentSuccessful(responseCode: string): boolean {
  return ['00', '10', '11'].includes(responseCode);
}

/**
 * Check if response code indicates payment is pending
 */
export function isPaymentPending(responseCode: string): boolean {
  return responseCode === '09';
}

/**
 * Check if response code indicates payment was cancelled
 */
export function isPaymentCancelled(responseCode: string): boolean {
  return ['Z6', '17', 'Z69'].includes(responseCode);
}

/**
 * Check if response code indicates payment can be retried
 */
export function canRetryPayment(responseCode: string): boolean {
  // Don't retry if successful, cancelled, or duplicate
  const noRetryCodes = [
    '00',
    '10',
    '11', // Successful
    'Z6',
    '17',
    'Z69', // Cancelled
    '94',
    'Z5', // Duplicate
    '41',
    '43', // Lost/Stolen card
  ];

  return !noRetryCodes.includes(responseCode);
}
