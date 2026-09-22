import { prisma } from "./prisma";
import {
  sowingWindowAdvice,
  irrigationAdvice,
  pestRiskAdvice,
  sellHoldAdvice,
  type AdvisoryDraft,
} from "./advisoryRules";
import { createNotification } from "./notificationService";

/**
 * Regenerates unacknowledged advisories for one crop cycle from the current
 * rule outputs, and leaves acknowledged ones alone as history. Called lazily
 * when a farmer views their advisory feed — there is no scheduled batch job
 * (Prefect et al.) in this tier, so "regenerate on read" is the substitute.
 */
export async function ensureAdvisoriesForCropCycle(cropCycleId: string): Promise<void> {
  const cycle = await prisma.cropCycle.findUnique({
    where: { id: cropCycleId },
    include: { crop: true, plot: { include: { farmer: true } } },
  });
  if (!cycle || cycle.status === "abandoned" || cycle.status === "harvested") return;

  const today = new Date();
  const drafts: AdvisoryDraft[] = [];

  if (cycle.status === "planned") {
    const sowing = sowingWindowAdvice(cycle.crop.code, today.getFullYear());
    if (sowing) drafts.push(sowing);
  }

  if (cycle.status === "sown" && cycle.sowingDate) {
    const irrigation = irrigationAdvice(cycle.crop.code, cycle.sowingDate, today);
    if (irrigation) drafts.push(irrigation);

    const pest = pestRiskAdvice(cycle.crop.code, today);
    if (pest) drafts.push(pest);

    const latestPrice = await prisma.priceObservation.findFirst({
      where: { cropId: cycle.cropId },
      orderBy: { observedDate: "desc" },
    });
    if (latestPrice) {
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
      const oldPrice = await prisma.priceObservation.findFirst({
        where: { cropId: cycle.cropId, observedDate: { lte: thirtyDaysAgo } },
        orderBy: { observedDate: "desc" },
      });
      const trendPct = oldPrice
        ? ((latestPrice.modalPriceRs - oldPrice.modalPriceRs) / oldPrice.modalPriceRs) * 100
        : 0;
      drafts.push(
        sellHoldAdvice(
          cycle.crop.name,
          today,
          latestPrice.modalPriceRs,
          latestPrice.mspRs,
          trendPct,
        ),
      );
    }
  }

  // Existing advisories (acknowledged or not) for this cycle, keyed by type +
  // action date, so an already-acknowledged advisory is never silently
  // recreated as a fresh unacknowledged one on the next page load.
  const existing = await prisma.advisory.findMany({ where: { cropCycleId } });

  for (const draft of drafts) {
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const alreadyCovered = existing.some(
      (e) =>
        e.adviceType === draft.adviceType &&
        sameDay(e.actionDateStart, draft.actionDateStart),
    );
    if (alreadyCovered) continue;

    // A stale, still-unacknowledged advisory of this type (from a previous,
    // now-outdated action date) should be replaced rather than left to pile up.
    await prisma.advisory.deleteMany({
      where: { cropCycleId, adviceType: draft.adviceType, acknowledged: false },
    });

    await prisma.advisory.create({
      data: {
        cropCycleId,
        adviceType: draft.adviceType,
        message: draft.message,
        reason: draft.reason,
        actionDateStart: draft.actionDateStart,
        actionDateEnd: draft.actionDateEnd,
        modelId: draft.modelId,
      },
    });

    if (cycle.plot.farmer.userId) {
      const severe = draft.adviceType === "pest_risk";
      await createNotification({
        userId: cycle.plot.farmer.userId,
        title: `New ${draft.adviceType.replaceAll("_", " ")} advisory — ${cycle.crop.name}`,
        body: draft.message,
        severe,
        relatedUrl: "/my-farm",
      });
    }
  }
}

export async function ensureAdvisoriesForFarmer(farmerId: string): Promise<void> {
  const cycles = await prisma.cropCycle.findMany({
    where: { plot: { farmerId }, status: { in: ["planned", "sown"] } },
    select: { id: true },
  });
  for (const cycle of cycles) {
    await ensureAdvisoriesForCropCycle(cycle.id);
  }
}
