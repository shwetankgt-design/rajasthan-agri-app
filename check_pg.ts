import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const [users, farmers, plots, fpos, crops, cycles, lots, offers, contracts, payments, prices, facilities, knowledge] =
    await Promise.all([
      prisma.user.count(),
      prisma.farmer.count(),
      prisma.plot.count(),
      prisma.fPO.count(),
      prisma.crop.count(),
      prisma.cropCycle.count(),
      prisma.lot.count(),
      prisma.offer.count(),
      prisma.contract.count(),
      prisma.payment.count(),
      prisma.priceObservation.count(),
      prisma.facility.count(),
      prisma.sopContent.count(),
    ]);
  console.log(
    JSON.stringify(
      { users, farmers, plots, fpos, crops, cycles, lots, offers, contracts, payments, prices, facilities, knowledge },
      null,
      1,
    ),
  );
}

main().finally(() => prisma.$disconnect());
