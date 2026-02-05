/**
 * Fix broken accepted offer - Reset to PENDING so it can be accepted again
 * Run this after adding production steps to the design
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for ACCEPTED offers without orders...\n');

    // Find all ACCEPTED offers
    const acceptedOffers = await prisma.offer.findMany({
        where: { status: 'ACCEPTED' },
        include: {
            design: { select: { id: true, title: true, productionSteps: true } },
            _count: { select: { orders: true } }
        }
    });

    console.log(`Found ${acceptedOffers.length} ACCEPTED offers\n`);

    for (const offer of acceptedOffers) {
        console.log('---');
        console.log('Offer ID:', offer.id);
        console.log('Customer Price:', offer.customerPrice);
        console.log('Final Price:', offer.finalPrice);
        console.log('Design:', offer.design.title);
        console.log('Orders created:', offer._count.orders);
        console.log('Production Steps:', offer.design.productionSteps ? 'YES' : 'NO');

        if (offer.design.productionSteps) {
            const steps = Array.isArray(offer.design.productionSteps) ? offer.design.productionSteps : [];
            console.log('Step count:', steps.length);
        }

        // If offer is ACCEPTED but no order was created
        if (offer._count.orders === 0) {
            console.log('\n❌ BROKEN: Offer accepted but no order created!');
            console.log('🔧 Resetting offer to PENDING...\n');

            await prisma.offer.update({
                where: { id: offer.id },
                data: {
                    status: 'PENDING',
                    finalPrice: null,
                    acceptedAt: null,
                }
            });

            console.log('✅ Offer reset to PENDING. You can now accept it again after adding production steps.\n');
        } else {
            console.log('✅ OK: Order exists for this offer\n');
        }
    }

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
