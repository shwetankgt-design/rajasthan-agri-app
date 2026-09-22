// Soil health and weather/rainfall detail shown on the farmer's "My Farm"
// page. There is no live soil-testing-lab or IMD weather feed integrated at
// this tier — everything here is deterministically generated (seeded by
// plot id / district+week, not random per page load) so it reads as a
// stable "snapshot" rather than flickering nonsense, but it must not be
// mistaken for a real soil report or forecast. Clearly labelled wherever
// it's rendered.
export const SOIL_HEALTH_MODEL_ID = "DEMO-SOIL-SNAPSHOT-V1";
export const WEATHER_MODEL_ID = "DEMO-WEATHER-OUTLOOK-V1";

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export type SoilHealth = {
  phLevel: number;
  phLabel: "acidic" | "neutral" | "alkaline";
  organicCarbonPct: number;
  nitrogen: "low" | "medium" | "high";
  phosphorus: "low" | "medium" | "high";
  potassium: "low" | "medium" | "high";
  texture: string;
  recommendation: string;
};

/** Deterministic per-plot soil health snapshot — same output every call for a given plot id. */
export function getSoilHealth(plotId: string, soilTypeDeclared: string | null): SoilHealth {
  const rand = mulberry32(hashSeed(plotId));

  const phLevel = Math.round((5.8 + rand() * 2.6) * 10) / 10; // 5.8 - 8.4
  const phLabel: SoilHealth["phLabel"] = phLevel < 6.5 ? "acidic" : phLevel > 7.8 ? "alkaline" : "neutral";
  const organicCarbonPct = Math.round((0.25 + rand() * 0.6) * 100) / 100;

  const levels: SoilHealth["nitrogen"][] = ["low", "medium", "high"];
  const nitrogen = pick(rand, levels);
  const phosphorus = pick(rand, levels);
  const potassium = pick(rand, levels);

  const lowNutrients = [
    ["nitrogen", nitrogen] as const,
    ["phosphorus", phosphorus] as const,
    ["potassium", potassium] as const,
  ].filter(([, v]) => v === "low");

  const recommendation =
    lowNutrients.length > 0
      ? `${lowNutrients.map(([n]) => n).join(" and ")} reading${lowNutrients.length > 1 ? "s are" : " is"} low — consider a soil-test-guided nutrient top-up before the next sowing.`
      : "Nutrient levels are in an adequate range — maintain current fertilisation practice.";

  return {
    phLevel,
    phLabel,
    organicCarbonPct,
    nitrogen,
    phosphorus,
    potassium,
    texture: soilTypeDeclared ?? "not declared",
    recommendation,
  };
}

export type WeatherOutlook = {
  last30DayRainfallMm: number;
  normalRainfallMm: number;
  rainfallStatus: "deficient" | "normal" | "surplus";
  forecast: { dayLabel: string; condition: string; tempMinC: number; tempMaxC: number; rainChancePct: number }[];
};

const CONDITIONS = ["Clear", "Partly cloudy", "Cloudy", "Light rain", "Thunderstorm"];

/** Deterministic per-district weather outlook, re-seeded weekly (not per request) so it's stable within a week. */
export function getWeatherOutlook(district: string, referenceDate: Date): WeatherOutlook {
  const weekNumber = Math.floor(referenceDate.getTime() / (7 * 86400000));
  const rand = mulberry32(hashSeed(`${district}:${weekNumber}`));

  const normalRainfallMm = district === "Bharatpur" ? 55 : 40;
  const last30DayRainfallMm = Math.round(normalRainfallMm * (0.5 + rand() * 1.1));
  const ratio = last30DayRainfallMm / normalRainfallMm;
  const rainfallStatus: WeatherOutlook["rainfallStatus"] = ratio < 0.8 ? "deficient" : ratio > 1.2 ? "surplus" : "normal";

  const forecast = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(referenceDate);
    day.setDate(day.getDate() + i);
    const dayRand = mulberry32(hashSeed(`${district}:${day.toISOString().slice(0, 10)}`));
    const tempMinC = Math.round(20 + dayRand() * 8);
    const tempMaxC = tempMinC + Math.round(10 + dayRand() * 6);
    return {
      dayLabel: i === 0 ? "Today" : day.toLocaleDateString("en-IN", { weekday: "short" }),
      condition: pick(dayRand, CONDITIONS),
      tempMinC,
      tempMaxC,
      rainChancePct: Math.round(dayRand() * 100),
    };
  });

  return { last30DayRainfallMm, normalRainfallMm, rainfallStatus, forecast };
}
