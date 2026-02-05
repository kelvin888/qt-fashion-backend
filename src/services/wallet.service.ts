import prisma from '../config/database';

interface CreditWalletData {
  userId: string;
  amount: number;
  description: string;
  orderId?: string;
}

interface DebitWalletData {
  userId: string;
  amount: number;
  description: string;
}

class WalletService {
  /**
   * Credit user's wallet
   */
  async creditWallet(data: CreditWalletData): Promise<void> {
    const { userId, amount, description, orderId } = data;

    // Get current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, fullName: true, brandName: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + amount;

    // Update balance and create transaction record in a transaction
    await prisma.$transaction([
      // Update user balance
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: balanceAfter },
      }),
      // Create transaction record
      prisma.walletTransaction.create({
        data: {
          userId,
          type: 'CREDIT',
          amount,
          balanceBefore,
          balanceAfter,
          description,
          orderId,
        },
      }),
    ]);

    console.log(
      `✅ Credited ₦${amount.toLocaleString()} to ${user.brandName || user.fullName}'s wallet`
    );
    console.log(`   Previous balance: ₦${balanceBefore.toLocaleString()}`);
    console.log(`   New balance: ₦${balanceAfter.toLocaleString()}`);
  }

  /**
   * Debit user's wallet (for withdrawals)
   */
  async debitWallet(data: DebitWalletData): Promise<void> {
    const { userId, amount, description } = data;

    // Get current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore - amount;

    // Update balance and create transaction record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: balanceAfter },
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter,
          description,
        },
      }),
    ]);

    console.log(`✅ Debited ₦${amount.toLocaleString()} from wallet`);
  }

  /**
   * Get user's wallet balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    return user?.walletBalance || 0;
  }

  /**
   * Get wallet transaction history
   */
  async getTransactions(userId: string) {
    return prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export default new WalletService();
