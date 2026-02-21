/**
 * Prisma Database Seeder
 * Seeds default platform settings and fee tiers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default platform settings
  console.log('📝 Creating platform settings...');

  await prisma.platformSettings.upsert({
    where: { key: 'platform_fee_percentage' },
    update: {},
    create: {
      key: 'platform_fee_percentage',
      value: '0.10',
      dataType: 'number',
      category: 'fees',
      description: 'Default platform fee percentage (10%)',
    },
  });

  await prisma.platformSettings.upsert({
    where: { key: 'min_withdrawal_amount' },
    update: {},
    create: {
      key: 'min_withdrawal_amount',
      value: '1000',
      dataType: 'number',
      category: 'payments',
      description: 'Minimum withdrawal amount for designers',
    },
  });

  console.log('✅ Platform settings created');

  // Seed default fee tiers
  console.log('🏆 Creating fee tiers...');

  const tiers = [
    {
      name: 'Bronze',
      minOrders: 0,
      maxOrders: 9,
      feePercentage: 0.1, // 10%
      priority: 1,
    },
    {
      name: 'Silver',
      minOrders: 10,
      maxOrders: 49,
      feePercentage: 0.08, // 8%
      priority: 2,
    },
    {
      name: 'Gold',
      minOrders: 50,
      maxOrders: null,
      feePercentage: 0.06, // 6%
      priority: 3,
    },
  ];

  for (const tier of tiers) {
    await prisma.feeTier.upsert({
      where: { name: tier.name },
      update: {},
      create: tier,
    });
  }

  console.log('✅ Fee tiers created');
  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
