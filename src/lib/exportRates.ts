// Indicative export-price estimate — a static premium over the domestic mandi
// modal price, illustrative only. There is no live export price feed (e.g.
// APEDA/DGFT FOB data) integrated at this tier; premiums below are rough,
// hand-set reference values per commodity and must not be read as a market
// quote. Cumin, guar and isabgol are Rajasthan's principal export commodities
// (guar gum, seed spices) so carry higher indicative premiums; bajra and
// mustard are overwhelmingly domestic-consumption crops and carry a small or
// zero premium.
export const EXPORT_PREMIUM_PCT: Record<string, number> = {
  MUSTARD: 4,
  GUAR: 22,
  BAJRA: 0,
  MOTH_BEAN: 8,
  CUMIN: 35,
  ISABGOL: 40,
};

export const EXPORT_RATE_MODEL_ID = "RULE-EXPORT-PREMIUM-V1";

export function estimateExportPriceRs(modalPriceRs: number, cropCode: string): number | null {
  const pct = EXPORT_PREMIUM_PCT[cropCode];
  if (pct === undefined) return null;
  return Math.round(modalPriceRs * (1 + pct / 100));
}
