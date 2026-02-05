/**
 * Add default production steps to existing designs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_PRODUCTION_STEPS = [
    {
        title: 'Fabric Sourcing',
        estimatedTime: '2-3 days',
        description: 'Source and procure quality fabrics'
    },
    {
        title: 'Pattern Making',
        estimatedTime: '1-2 days',
        description: 'Create and finalize garment patterns'
    },
    {
        title: 'Cutting',
        estimatedTime: '1 day',
        description: 'Cut fabric according to patterns'
    },
    {
        title: 'Sewing & Assembly',
        estimatedTime: '3-5 days',
        description: 'Assemble garment pieces'
    },
    {
        title: 'Quality Check & Finishing',
        estimatedTime: '1-2 days',
        description: 'Final inspection and finishing touches'
    }
];

async function main() {
    console.log('🔍 Finding designs without production steps...\n');

    const designsWithoutSteps = await prisma.design.findMany({
        where: {
            OR: [
                { productionSteps: null },
                { productionSteps: { equals: prisma.DbNull } }
            ]
        },
        select: { id: true, title: true }
    });

    console.log(`Found ${designsWithoutSteps.length} designs without production steps\n`);

    if (designsWithoutSteps.length === 0) {
        console.log('✅ All designs already have production steps!');
        return;
    }

    console.log('📝 Adding default production steps...\n');

    for (const design of designsWithoutSteps) {
        await prisma.design.update({
            where: { id: design.id },
            data: { productionSteps: DEFAULT_PRODUCTION_STEPS }
        });
        console.log(`✅ Updated: ${design.title}`);
    }

    console.log(`\n✅ Successfully added production steps to ${designsWithoutSteps.length} designs!`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
