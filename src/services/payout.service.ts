import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface BankLookupRequest {
  transactionReference: string;
  payoutChannel: string;
  recipient: {
    currencyCode: string;
    amount: number;
    recipientBank: string;
    recipientAccount: string;
  };
}

interface BankLookupResponse {
  reference: string;
  transactionReference: string;
  currencyCode: string;
  amount: number;
  recipientBank: string;
  recipientName: string;
  recipientAccount: string;
}

interface PayoutRequest {
  transactionReference: string;
  payoutChannel: string;
  amount: number;
  currencyCode: string;
  narration: string;
  recipient: {
    recipientBank: string;
    recipientName: string;
    recipientAccount: string;
  };
  walletDetails: {
    walletId: string;
    pin?: string;
  };
  singleCall: boolean;
}

interface PayoutResponse {
  id: string;
  reference: string;
  transactionReference: string;
  amount: number;
  fee: number;
  currencyCode: string;
  channel: string;
  status: string;
  narration: string;
  clientId: string;
  recipientAccount: string;
  recipientBank: string;
  recipientName: string;
  sourceAccount: string;
  responseCode: string;
  responseDescription: string;
  processingReference: string;
  walletDebit: boolean;
  retryCount: number;
}

interface WalletBalanceResponse {
  statusCode: string;
  responseCode: string;
  responseMessage: string;
  count: number;
  availableBalance: number;
  ledgerBalance: number;
}

interface InterswitchAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class PayoutService {
  private clientId: string;
  private clientSecret: string;
  private walletId: string;
  private walletPin: string;
  private merchantCode: string;
  private apiBaseUrl: string;
  private terminalId: string;
  private payoutFee: number;
  private minWithdrawalAmount: number;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.INTERSWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.INTERSWITCH_CLIENT_SECRET || '';
    this.walletId = process.env.INTERSWITCH_WALLET_ID || '2700008457';
    this.walletPin = process.env.INTERSWITCH_WALLET_PIN || '';
    this.merchantCode = process.env.INTERSWITCH_MERCHANT_CODE || 'MX51309';
    this.apiBaseUrl = process.env.INTERSWITCH_API_BASE_URL || 'https://qa.interswitchng.com';
    this.terminalId = process.env.INTERSWITCH_TERMINAL_ID || process.env.TERMINAL_ID || '';
    this.payoutFee = parseFloat(process.env.INTERSWITCH_PAYOUT_FEE || '10');
    this.minWithdrawalAmount = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '1000');
  }

  /**
   * Generate unique transaction reference for payouts
   */
  generateTransactionRef(): string {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `PAYOUT-${timestamp}-${uuid}`.toUpperCase();
  }

  /**
   * Get Interswitch access token using OAuth2 client credentials
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Note: Interswitch might use Basic Auth or OAuth2 - adjust based on actual API docs
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post<InterswitchAuthResponse>(
        `${this.apiBaseUrl}/api/v1/auth/token`,
        {
          grant_type: 'client_credentials',
        },
        {
          headers: {
            Authorization: `Basic ${authString}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Interswitch access token:', error);
      throw new Error('Failed to authenticate with payment provider');
    }
  }

  /**
   * Lookup bank account to verify recipient details
   */
  async lookupBankAccount(
    bankCode: string,
    accountNumber: string,
    amount: number = 100
  ): Promise<{ accountName: string }> {
    console.log('🔍 [NAME ENQUIRY] Starting bank account lookup');
    console.log('🔍 [NAME ENQUIRY] Input params:', {
      bankCode,
      accountNumber,
      amount,
      hasTerminalId: !!this.terminalId,
      apiBaseUrl: this.apiBaseUrl,
    });

    try {
      // Preferred: Quickteller Account Name Inquiry (QA)
      // curl --request POST \
      //  --url https://qa.interswitchng.com/quicktellerservice/api/v5/Transactions/DoAccountNameInquiry \
      //  --header 'Content-Type: application/json' \
      //  --header 'TerminalID: TERMINAL_ID' \
      //  --header 'accept: application/json' \
      //  --header 'accountid: 0730804844' \
      //  --header 'bankcode: 044'
      if (this.terminalId) {
        console.log('🔍 [NAME ENQUIRY] Using Quickteller DoAccountNameInquiry endpoint');
        console.log('🔍 [NAME ENQUIRY] Request headers:', {
          'Content-Type': 'application/json',
          accept: 'application/json',
          TerminalID: this.terminalId,
          accountid: accountNumber,
          bankcode: bankCode,
        });

        const response = await axios.post(
          `${this.apiBaseUrl}/quicktellerservice/api/v5/Transactions/DoAccountNameInquiry`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json',
              TerminalID: this.terminalId,
              accountid: accountNumber,
              bankcode: bankCode,
            },
            timeout: 15000,
          }
        );

        console.log('🔍 [NAME ENQUIRY] Response status:', response.status);
        console.log('🔍 [NAME ENQUIRY] Response headers:', response.headers);
        console.log('🔍 [NAME ENQUIRY] Raw response data:', JSON.stringify(response.data, null, 2));

        const data: any = response.data;

        console.log('🔍 [NAME ENQUIRY] Checking for accountName in various fields...');
        console.log('🔍 [NAME ENQUIRY] data.accountName:', data?.accountName);
        console.log('🔍 [NAME ENQUIRY] data.account_name:', data?.account_name);
        console.log('🔍 [NAME ENQUIRY] data.accountname:', data?.accountname);
        console.log('🔍 [NAME ENQUIRY] data.customerName:', data?.customerName);
        console.log('🔍 [NAME ENQUIRY] data.name:', data?.name);
        console.log('🔍 [NAME ENQUIRY] data.data?.accountName:', data?.data?.accountName);
        console.log('🔍 [NAME ENQUIRY] data.response?.accountName:', data?.response?.accountName);
        console.log(
          '🔍 [NAME ENQUIRY] data.accountNameInquiryResponse?.accountName:',
          data?.accountNameInquiryResponse?.accountName
        );

        const accountName: string | undefined =
          data?.accountName ||
          data?.account_name ||
          data?.accountname ||
          data?.customerName ||
          data?.name ||
          data?.data?.accountName ||
          data?.response?.accountName ||
          data?.accountNameInquiryResponse?.accountName;

        console.log('🔍 [NAME ENQUIRY] Extracted accountName:', accountName);

        if (typeof accountName === 'string' && accountName.trim().length > 0) {
          console.log('✅ [NAME ENQUIRY] Successfully found account name:', accountName.trim());
          return { accountName: accountName.trim() };
        }

        const message =
          data?.responseMessage ||
          data?.message ||
          data?.responseDescription ||
          'Failed to verify bank account';
        console.error(
          '❌ [NAME ENQUIRY] No account name found in response. Error message:',
          message
        );
        throw new Error(message);
      }

      // Fallback: existing payout customer-lookup (requires OAuth token)
      console.log('🔍 [NAME ENQUIRY] No terminalId - falling back to OAuth customer-lookup');
      const token = await this.getAccessToken();
      const transactionRef = this.generateTransactionRef();
      console.log('🔍 [NAME ENQUIRY] Generated transaction ref:', transactionRef);

      const requestData: BankLookupRequest = {
        transactionReference: transactionRef,
        payoutChannel: 'BANK_TRANSFER',
        recipient: {
          currencyCode: 'NGN',
          amount: amount,
          recipientBank: bankCode,
          recipientAccount: accountNumber,
        },
      };

      console.log('🔍 [NAME ENQUIRY] Fallback request data:', JSON.stringify(requestData, null, 2));

      const response = await axios.post<BankLookupResponse>(
        `${this.apiBaseUrl}/api/v1/payouts/customer-lookup`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      console.log('🔍 [NAME ENQUIRY] Fallback response status:', response.status);
      console.log(
        '🔍 [NAME ENQUIRY] Fallback response data:',
        JSON.stringify(response.data, null, 2)
      );
      console.log(
        '✅ [NAME ENQUIRY] Successfully found account name via fallback:',
        response.data.recipientName
      );

      return {
        accountName: response.data.recipientName,
      };
    } catch (error) {
      console.error('❌ [NAME ENQUIRY] Error occurred during bank account lookup');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.error('❌ [NAME ENQUIRY] Axios error details:');
        console.error('   - Status:', axiosError.response?.status);
        console.error('   - Status Text:', axiosError.response?.statusText);
        console.error('   - Response Headers:', axiosError.response?.headers);
        console.error('   - Response Data:', JSON.stringify(axiosError.response?.data, null, 2));
        console.error('   - Request URL:', axiosError.config?.url);
        console.error('   - Request Method:', axiosError.config?.method);
        console.error('   - Request Headers:', axiosError.config?.headers);

        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.responseDescription ||
          axiosError.response?.data?.responseMessage ||
          'Failed to verify bank account';

        console.error('❌ [NAME ENQUIRY] Throwing error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.error('❌ [NAME ENQUIRY] Non-axios error:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance from Interswitch
   */
  async getWalletBalance(): Promise<{ available: number; ledger: number }> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get<WalletBalanceResponse>(
        `${this.apiBaseUrl}/merchant-wallet/api/v1/wallet/balance/${this.merchantCode}?walletId=${this.walletId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        available: response.data.availableBalance,
        ledger: response.data.ledgerBalance,
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      // Return 0 if unable to fetch (graceful degradation)
      return { available: 0, ledger: 0 };
    }
  }

  /**
   * Create a payout/withdrawal request
   */
  async createPayout(userId: string, amount: number): Promise<any> {
    // Validate minimum amount
    if (amount < this.minWithdrawalAmount) {
      throw new Error(`Minimum withdrawal amount is ₦${this.minWithdrawalAmount.toLocaleString()}`);
    }

    // Get user details with bank info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        walletBalance: true,
        accountNumber: true,
        accountName: true,
        bankName: true,
        bankCode: true,
        accountVerified: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate bank details are set
    if (!user.accountNumber || !user.accountName || !user.bankCode) {
      throw new Error('Please add your bank account details before requesting a withdrawal');
    }

    // Calculate total debit (amount + fee)
    const fee = this.payoutFee;
    const netAmount = amount;
    const totalDebit = amount + fee;

    // Check sufficient balance
    if (user.walletBalance < totalDebit) {
      throw new Error(
        `Insufficient balance. You need ₦${totalDebit.toLocaleString()} (₦${amount.toLocaleString()} + ₦${fee} fee) but have ₦${user.walletBalance.toLocaleString()}`
      );
    }

    // Generate transaction reference
    const transactionRef = this.generateTransactionRef();

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        userId: user.id,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        status: 'PENDING',
        channel: 'BANK_TRANSFER',
        recipientBank: user.bankCode,
        recipientAccount: user.accountNumber,
        recipientName: user.accountName,
        transactionReference: transactionRef,
        narration: `Withdrawal to ${user.bankName}`,
      },
    });

    try {
      // Debit wallet first
      await this.debitWallet(userId, totalDebit, `Withdrawal request ${transactionRef}`);

      // Update payout status to PROCESSING
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'PROCESSING' },
      });

      // Call Interswitch Payout API
      const token = await this.getAccessToken();

      const payoutRequest: PayoutRequest = {
        transactionReference: transactionRef,
        payoutChannel: 'BANK_TRANSFER',
        amount: netAmount,
        currencyCode: 'NGN',
        narration: `Withdrawal to ${user.bankName}`,
        recipient: {
          recipientBank: user.bankCode,
          recipientName: user.accountName,
          recipientAccount: user.accountNumber,
        },
        walletDetails: {
          walletId: this.walletId,
          pin: this.walletPin,
        },
        singleCall: true, // Perform lookup and payout in one call
      };

      const response = await axios.post<PayoutResponse>(
        `${this.apiBaseUrl}/api/v1/payouts`,
        payoutRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      // Update payout with Interswitch response
      const updatedPayout = await prisma.payout.update({
        where: { id: payout.id },
        data: {
          interswitchReference: response.data.reference,
          processingReference: response.data.processingReference,
          responseCode: response.data.responseCode,
          responseMessage: response.data.responseDescription,
          status: response.data.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'PROCESSING',
          completedAt: response.data.status === 'SUCCESSFUL' ? new Date() : null,
        },
      });

      return updatedPayout;
    } catch (error) {
      // If payout API call fails, refund the wallet and mark payout as failed
      await this.refundWallet(userId, totalDebit, `Refund for failed withdrawal ${transactionRef}`);

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          responseMessage: axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : 'Payout request failed',
        },
      });

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.error('Payout API error:', axiosError.response?.data);
        throw new Error(
          axiosError.response?.data?.message ||
            axiosError.response?.data?.responseDescription ||
            'Failed to process withdrawal. Your balance has been refunded.'
        );
      }
      throw new Error('Failed to process withdrawal. Your balance has been refunded.');
    }
  }

  /**
   * Get payout status from Interswitch
   */
  async getPayoutStatus(transactionReference: string): Promise<PayoutResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get<PayoutResponse>(
        `${this.apiBaseUrl}/api/v1/payouts/${transactionReference}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get payout status:', error);
      throw new Error('Failed to check payout status');
    }
  }

  /**
   * Update payout status (can be called by webhook or manually)
   */
  async updatePayoutStatus(transactionReference: string): Promise<any> {
    const payout = await prisma.payout.findUnique({
      where: { transactionReference },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Only update if still processing
    if (payout.status !== 'PROCESSING') {
      return payout;
    }

    try {
      const status = await this.getPayoutStatus(transactionReference);

      const updatedPayout = await prisma.payout.update({
        where: { transactionReference },
        data: {
          status: status.status,
          responseCode: status.responseCode,
          responseMessage: status.responseDescription,
          completedAt:
            status.status === 'SUCCESSFUL' || status.status === 'FAILED' ? new Date() : null,
        },
      });

      // If failed, refund the wallet
      if (status.status === 'FAILED') {
        const totalDebit = payout.amount + payout.fee;
        await this.refundWallet(
          payout.userId,
          totalDebit,
          `Refund for failed withdrawal ${transactionReference}`
        );
      }

      return updatedPayout;
    } catch (error) {
      console.error('Failed to update payout status:', error);
      throw error;
    }
  }

  /**
   * Get user's payout history
   */
  async getUserPayouts(userId: string, limit: number = 50, offset: number = 0) {
    const payouts = await prisma.payout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payout.count({
      where: { userId },
    });

    return {
      payouts,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string, userId: string) {
    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        userId: userId,
      },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    return payout;
  }

  /**
   * Debit user wallet
   */
  private async debitWallet(userId: string, amount: number, description: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore - amount;

    if (balanceAfter < 0) {
      throw new Error('Insufficient balance');
    }

    // Update user wallet balance
    await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: balanceAfter },
    });

    // Create wallet transaction record
    await prisma.walletTransaction.create({
      data: {
        userId,
        type: 'DEBIT',
        amount,
        balanceBefore,
        balanceAfter,
        description,
      },
    });
  }

  /**
   * Refund user wallet (in case of failed payout)
   */
  private async refundWallet(userId: string, amount: number, description: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + amount;

    // Update user wallet balance
    await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: balanceAfter },
    });

    // Create wallet transaction record
    await prisma.walletTransaction.create({
      data: {
        userId,
        type: 'CREDIT',
        amount,
        balanceBefore,
        balanceAfter,
        description,
      },
    });
  }

  /**
   * Handle webhook from Interswitch (status updates)
   */
  async handleWebhook(payload: any): Promise<void> {
    try {
      const { transactionReference, status, responseCode, responseDescription } = payload;

      const payout = await prisma.payout.findUnique({
        where: { transactionReference },
      });

      if (!payout) {
        console.error('Payout not found for webhook:', transactionReference);
        return;
      }

      // Update payout status
      await prisma.payout.update({
        where: { transactionReference },
        data: {
          status,
          responseCode,
          responseMessage: responseDescription,
          completedAt: status === 'SUCCESSFUL' || status === 'FAILED' ? new Date() : null,
        },
      });

      // If failed, refund the wallet
      if (status === 'FAILED' && payout.status !== 'FAILED') {
        const totalDebit = payout.amount + payout.fee;
        await this.refundWallet(
          payout.userId,
          totalDebit,
          `Refund for failed withdrawal ${transactionReference}`
        );
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }
}
