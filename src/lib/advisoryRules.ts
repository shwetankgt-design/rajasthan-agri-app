/**
 * Rule-based advisory generation — deliberately NOT machine learning. The full
 * FRS calls for MD-02 (sowing window), MD-04 (irrigation), MD-07 (price) and
 * MD-05 (pest) predictive models trained on weather/satellite/market data.
 * None of that exists here; this is static agronomic calendar data plus
 * simple price-vs-MSP comparison, standing in for it so the farmer-facing
 * advisory feed (M3) has something real to render. Every advisory still
 * carries a model ID and generation timestamp — the stamping discipline is
 * real even though the "model" is a lookup table, not a trained model.
 */

export type AdvisoryDraft = {
  adviceType: "sowing_window" | "irrigation" | "sell_hold" | "pest_risk";
  message: string;
  reason: string;
  actionDateStart: Date;
  actionDateEnd: Date | null;
  modelId: string;
};

type SowingWindow = { startMonth: number; startDay: number; endMonth: number; endDay: number };
type CropCalendar = {
  sowingWindow: SowingWindow; // month is 0-indexed (JS Date convention)
  criticalStageDays: number; // days after sowing when water stress does the most damage
  criticalStageName: string;
  pestNote: string;
};

const CROP_CALENDAR: Record<string, CropCalendar> = {
  GUAR: {
    sowingWindow: { startMonth: 5, startDay: 20, endMonth: 6, endDay: 10 },
    criticalStageDays: 35,
    criticalStageName: "flowering",
    pestNote: "Aphid and whitefly pressure rises in humid spells after rain — scout undersides of leaves weekly.",
  },
  BAJRA: {
    sowingWindow: { startMonth: 5, startDay: 15, endMonth: 6, endDay: 5 },
    criticalStageDays: 30,
    criticalStageName: "flowering",
    pestNote: "Shoot fly risk is highest in the first three weeks after sowing in a dry start to the season.",
  },
  MOTH_BEAN: {
    sowingWindow: { startMonth: 5, startDay: 20, endMonth: 6, endDay: 10 },
    criticalStageDays: 30,
    criticalStageName: "flowering",
    pestNote: "Yellow mosaic virus spreads via whitefly — remove and destroy infected plants early.",
  },
  MUSTARD: {
    sowingWindow: { startMonth: 9, startDay: 10, endMonth: 9, endDay: 25 },
    criticalStageDays: 75,
    criticalStageName: "siliqua fill",
    pestNote: "Aphid buildup accelerates from January onward — a light irrigation can reduce dust that favours them.",
  },
  CUMIN: {
    sowingWindow: { startMonth: 10, startDay: 1, endMonth: 10, endDay: 20 },
    criticalStageDays: 45,
    criticalStageName: "flowering",
    pestNote: "Blight risk rises sharply under humid, cloudy conditions during flowering — avoid overhead irrigation then.",
  },
  ISABGOL: {
    sowingWindow: { startMonth: 10, startDay: 1, endMonth: 10, endDay: 15 },
    criticalStageDays: 50,
    criticalStageName: "spike emergence",
    pestNote: "Downy mildew spreads fast in cool, humid weather — ensure fields drain well after any rain.",
  },
};

function dateInYear(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

export function sowingWindowAdvice(cropCode: string, referenceYear: number): AdvisoryDraft | null {
  const cal = CROP_CALENDAR[cropCode];
  if (!cal) return null;
  const start = dateInYear(referenceYear, cal.sowingWindow.startMonth, cal.sowingWindow.startDay);
  const end = dateInYear(referenceYear, cal.sowingWindow.endMonth, cal.sowingWindow.endDay);
  return {
    adviceType: "sowing_window",
    message: `Sow between ${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} and ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
    reason: "Based on the standard sowing calendar for this crop in Rajasthan.",
    actionDateStart: start,
    actionDateEnd: end,
    modelId: "RULE-SOWING-V1",
  };
}

export function irrigationAdvice(
  cropCode: string,
  sowingDate: Date,
  today: Date,
): AdvisoryDraft | null {
  const cal = CROP_CALENDAR[cropCode];
  if (!cal) return null;

  const daysSinceSowing = Math.max(
    0,
    Math.floor((today.getTime() - sowingDate.getTime()) / 86400000),
  );
  const daysToCriticalStage = cal.criticalStageDays - daysSinceSowing;

  // Only surface this while the critical stage is still ahead or was very recent —
  // otherwise it's stale information for a farmer looking at "today".
  if (daysToCriticalStage < -10 || daysToCriticalStage > 21) return null;

  const criticalDate = new Date(sowingDate.getTime() + cal.criticalStageDays * 86400000);
  const windowStart = new Date(criticalDate.getTime() - 3 * 86400000);
  const windowEnd = new Date(criticalDate.getTime() + 3 * 86400000);

  return {
    adviceType: "irrigation",
    message: `Irrigate between ${windowStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} and ${windowEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — the crop is approaching ${cal.criticalStageName}.`,
    reason: `${cal.criticalStageName} is the growth stage most sensitive to water stress for this crop.`,
    actionDateStart: windowStart,
    actionDateEnd: windowEnd,
    modelId: "RULE-IRRIGATION-V1",
  };
}

export function pestRiskAdvice(cropCode: string, today: Date): AdvisoryDraft | null {
  const cal = CROP_CALENDAR[cropCode];
  if (!cal) return null;
  const windowEnd = new Date(today.getTime() + 10 * 86400000);
  return {
    adviceType: "pest_risk",
    message: cal.pestNote,
    reason: "Based on the seasonal pest risk pattern for this crop.",
    actionDateStart: today,
    actionDateEnd: windowEnd,
    modelId: "RULE-PEST-SEASONAL-V1",
  };
}

export function sellHoldAdvice(
  cropName: string,
  today: Date,
  modalPriceRs: number,
  mspRs: number | null,
  trend30dPct: number,
): AdvisoryDraft {
  const windowEnd = new Date(today.getTime() + 7 * 86400000);
  let message: string;
  let reason: string;

  if (mspRs && modalPriceRs < mspRs) {
    message = `${cropName} is trading below MSP — consider selling to procurement centres at MSP instead of the open mandi.`;
    reason = `Modal price ₹${modalPriceRs.toFixed(0)}/qtl is below the MSP of ₹${mspRs.toFixed(0)}/qtl.`;
  } else if (trend30dPct > 3) {
    message = `${cropName} prices have risen over the last 30 days — holding a little longer may pay off if storage cost is low.`;
    reason = `Modal price is up ${trend30dPct.toFixed(1)}% over 30 days.`;
  } else if (trend30dPct < -3) {
    message = `${cropName} prices have been falling — selling soon may be better than waiting.`;
    reason = `Modal price is down ${Math.abs(trend30dPct).toFixed(1)}% over 30 days.`;
  } else {
    message = `${cropName} prices have been broadly stable over the last month.`;
    reason = "No strong 30-day trend either way.";
  }

  return {
    adviceType: "sell_hold",
    message,
    reason,
    actionDateStart: today,
    actionDateEnd: windowEnd,
    modelId: "RULE-SELLHOLD-V1",
  };
}
