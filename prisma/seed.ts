import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeEventHash } from "../src/lib/custodyChain";

const prisma = new PrismaClient();

// Two pilot districts (placeholder pending the client's <<DECIDE>> on final pilot
// districts — see CLAUDE.md). Centre coordinates are approximate district-town
// locations; plots are scattered within a small radius of these.
const DISTRICTS = [
  {
    name: "Jodhpur",
    centerLat: 26.2389,
    centerLng: 73.0243,
    villages: ["Bhopalgarh", "Osian", "Bilara", "Luni"],
    tehsil: "Jodhpur",
  },
  {
    name: "Bharatpur",
    centerLat: 27.2152,
    centerLng: 77.4977,
    villages: ["Nadbai", "Deeg", "Kumher", "Weir"],
    tehsil: "Bharatpur",
  },
];

const CROPS = [
  { name: "Mustard", code: "MUSTARD", varieties: ["Pusa Bold", "RH-725"], indicativeYieldKgHa: 1400, mspRs: 5950 },
  { name: "Guar", code: "GUAR", varieties: ["RGC-1066", "HG-365"], indicativeYieldKgHa: 700, mspRs: null },
  { name: "Bajra", code: "BAJRA", varieties: ["RHB-177", "HHB-67"], indicativeYieldKgHa: 2100, mspRs: 2625 },
  { name: "Moth Bean", code: "MOTH_BEAN", varieties: ["RMO-435", "IPCMO-912"], indicativeYieldKgHa: 550, mspRs: null },
  { name: "Cumin", code: "CUMIN", varieties: ["GC-4", "RZ-19"], indicativeYieldKgHa: 600, mspRs: null },
  { name: "Isabgol", code: "ISABGOL", varieties: ["Gujarat Isabgol-2"], indicativeYieldKgHa: 500, mspRs: null },
];

// Indicative mandi price ranges (Rs/quintal), loosely representative of Rajasthan
// mandis for these commodities — for demo price-comparison purposes only, not a
// live feed. Real integration is Prompt-D-equivalent future work (Agmarknet API).
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  MUSTARD: { min: 5400, max: 6200 },
  GUAR: { min: 4800, max: 5600 },
  BAJRA: { min: 2200, max: 2700 },
  MOTH_BEAN: { min: 6500, max: 7800 },
  CUMIN: { min: 24000, max: 32000 },
  ISABGOL: { min: 11000, max: 14500 },
};

const IRRIGATION_SOURCES = ["canal", "tubewell", "open_well", "farm_pond", "rainfed"];
const LANDHOLDING_CATEGORIES = ["marginal", "small", "semi-medium", "medium", "large"];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42); // deterministic seed data across runs

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function squarePolygon(lat: number, lng: number, halfSideDeg: number) {
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - halfSideDeg, lat - halfSideDeg],
        [lng + halfSideDeg, lat - halfSideDeg],
        [lng + halfSideDeg, lat + halfSideDeg],
        [lng - halfSideDeg, lat + halfSideDeg],
        [lng - halfSideDeg, lat - halfSideDeg],
      ],
    ],
  };
}

async function main() {
  console.log("Seeding…");

  await prisma.auditLog.deleteMany();
  await prisma.dataSubjectRequest.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.advisory.deleteMany();
  await prisma.sopContent.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.transporter.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.custodyEvent.deleteMany();
  await prisma.lotComponent.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.priceObservation.deleteMany();
  await prisma.mandiMaster.deleteMany();
  await prisma.cropCycle.deleteMany();
  await prisma.plot.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.farmer.deleteMany();
  await prisma.variety.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.fPO.deleteMany();

  // Crops & varieties
  const cropRecords: Record<string, { id: string; varieties: { id: string; name: string }[] }> = {};
  for (const c of CROPS) {
    const crop = await prisma.crop.create({
      data: { name: c.name, code: c.code, indicativeYieldKgHa: c.indicativeYieldKgHa },
    });
    const varieties = [];
    for (const v of c.varieties) {
      varieties.push(
        await prisma.variety.create({
          data: { cropId: crop.id, name: v, durationDays: 90 + Math.floor(rand() * 40) },
        }),
      );
    }
    cropRecords[c.code] = { id: crop.id, varieties };
  }

  // FPOs — 3 total, split across the two districts
  const fpoDefs = [
    { legalName: "Marudhara Farmers Producer Company Ltd", registrationNumber: "FPO-RJ-JDH-001", district: "Jodhpur" },
    { legalName: "Thar Kisan Producer Company Ltd", registrationNumber: "FPO-RJ-JDH-002", district: "Jodhpur" },
    { legalName: "Bharatpur Krishi Utpadak Sangathan", registrationNumber: "FPO-RJ-BTP-001", district: "Bharatpur" },
  ];
  const fpos = [];
  for (const f of fpoDefs) {
    fpos.push(await prisma.fPO.create({ data: f }));
  }

  // Mandis and 90 days of daily price observations per crop (M04 price comparison)
  const mandiDefs = [
    { name: "Jodhpur Krishi Upaj Mandi", district: "Jodhpur" },
    { name: "Osian Mandi", district: "Jodhpur" },
    { name: "Bharatpur Krishi Upaj Mandi", district: "Bharatpur" },
    { name: "Deeg Mandi", district: "Bharatpur" },
  ];
  const mandis = [];
  for (const m of mandiDefs) {
    mandis.push(await prisma.mandiMaster.create({ data: m }));
  }

  const today = new Date("2026-08-08");
  for (const c of CROPS) {
    const crop = cropRecords[c.code];
    const range = PRICE_RANGES[c.code];
    for (const mandi of mandis) {
      for (let d = 89; d >= 0; d -= 3) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const spread = range.max - range.min;
        const modal = Math.round(range.min + rand() * spread);
        const min = Math.round(modal - spread * 0.08);
        const max = Math.round(modal + spread * 0.08);
        await prisma.priceObservation.create({
          data: {
            mandiId: mandi.id,
            cropId: crop.id,
            observedDate: date,
            minPriceRs: min,
            maxPriceRs: max,
            modalPriceRs: modal,
            mspRs: c.mspRs,
          },
        });
      }
    }
  }

  // Facilities and transporters (M08). Coordinates jittered around each
  // district centre, same approach as plot scatter above.
  const facilityDefs = [
    {
      name: "Jodhpur FPO Collection Centre",
      facilityType: "collection_centre",
      ownerName: "Marudhara Farmers Producer Company Ltd",
      operatorName: "Marudhara FPO",
      ownershipType: "fpo_owned",
      district: "Jodhpur",
      village: "Bhopalgarh",
      latOffset: [0.05, -0.03],
      capacityValue: 500,
      capacityUnit: "tonnes",
      commoditiesHandled: "GUAR,BAJRA,MOTH_BEAN,CUMIN,ISABGOL",
      certifications: "",
      verified: true,
    },
    {
      name: "Osian Warehouse",
      facilityType: "warehouse",
      ownerName: "Rajasthan State Warehousing Corporation",
      operatorName: "RSWC",
      ownershipType: "government",
      district: "Jodhpur",
      village: "Osian",
      latOffset: [-0.08, 0.06],
      capacityValue: 2000,
      capacityUnit: "tonnes",
      commoditiesHandled: "GUAR,BAJRA,MOTH_BEAN",
      certifications: "ISO 9001",
      verified: true,
    },
    {
      name: "Thar Cold Storage",
      facilityType: "cold_storage",
      ownerName: "Thar Kisan Producer Company Ltd",
      operatorName: "Thar Kisan FPO",
      ownershipType: "fpo_owned",
      district: "Jodhpur",
      village: "Bilara",
      latOffset: [0.02, 0.09],
      capacityValue: 150,
      capacityUnit: "tonnes",
      commoditiesHandled: "CUMIN,ISABGOL",
      certifications: "",
      verified: false,
    },
    {
      name: "Jodhpur Assaying Lab",
      facilityType: "assaying_lab",
      ownerName: "Private",
      operatorName: "Marwar Quality Testing Services",
      ownershipType: "private",
      district: "Jodhpur",
      village: "Luni",
      latOffset: [-0.04, -0.07],
      capacityValue: 50,
      capacityUnit: "samples/day",
      commoditiesHandled: "GUAR,BAJRA,MOTH_BEAN,CUMIN,ISABGOL,MUSTARD",
      certifications: "NABL Accredited",
      verified: true,
    },
    {
      name: "Bharatpur Krishi Utpadak Sangathan Godown",
      facilityType: "warehouse",
      ownerName: "Bharatpur Krishi Utpadak Sangathan",
      operatorName: "Bharatpur Krishi Utpadak Sangathan",
      ownershipType: "fpo_owned",
      district: "Bharatpur",
      village: "Nadbai",
      latOffset: [0.03, 0.04],
      capacityValue: 800,
      capacityUnit: "tonnes",
      commoditiesHandled: "MUSTARD,BAJRA",
      certifications: "",
      verified: true,
    },
    {
      name: "Bharatpur Mustard Processing Unit",
      facilityType: "primary_processing",
      ownerName: "Bharatpur Oil Mills Pvt Ltd",
      operatorName: "Bharatpur Oil Mills Pvt Ltd",
      ownershipType: "private",
      district: "Bharatpur",
      village: "Deeg",
      latOffset: [-0.06, -0.02],
      capacityValue: 300,
      capacityUnit: "tonnes/month",
      commoditiesHandled: "MUSTARD",
      certifications: "FSSAI",
      verified: true,
    },
  ];

  for (const f of facilityDefs) {
    const district = DISTRICTS.find((d) => d.name === f.district)!;
    await prisma.facility.create({
      data: {
        name: f.name,
        facilityType: f.facilityType,
        ownerName: f.ownerName,
        operatorName: f.operatorName,
        ownershipType: f.ownershipType,
        district: f.district,
        village: f.village,
        lat: district.centerLat + f.latOffset[0],
        lng: district.centerLng + f.latOffset[1],
        capacityValue: f.capacityValue,
        capacityUnit: f.capacityUnit,
        commoditiesHandled: f.commoditiesHandled,
        certifications: f.certifications || null,
        tariffStructure: "Rs 50/quintal handling + storage per FPO agreement",
        contactPhone: "0291-2200000",
        operatingHours: "9:00 AM – 6:00 PM",
        verified: f.verified,
      },
    });
  }

  const transporterDefs = [
    {
      name: "Marudhara Logistics",
      vehicleClasses: "mini_truck,truck",
      serviceDistricts: "Jodhpur",
      coldChainCapable: false,
      ratePerKmRs: 45,
    },
    {
      name: "Thar Cold Chain Carriers",
      vehicleClasses: "refrigerated,truck",
      serviceDistricts: "Jodhpur,Bharatpur",
      coldChainCapable: true,
      ratePerKmRs: 65,
    },
    {
      name: "Bharatpur Transport Co-operative",
      vehicleClasses: "tractor_trolley,truck",
      serviceDistricts: "Bharatpur",
      coldChainCapable: false,
      ratePerKmRs: 40,
    },
  ];
  for (const t of transporterDefs) {
    await prisma.transporter.create({ data: { ...t, contactPhone: "0291-2211000" } });
  }

  // Knowledge/SOP library (M09) — agronomy and governance content.
  await prisma.sopContent.create({
    data: {
      title: "Guar Sowing — Package of Practices",
      audience: "farmer",
      category: "agronomy",
      cropCode: "GUAR",
      operation: "sowing",
      season: "Kharif",
      contentBody:
        "Sow with the onset of monsoon (last week of June to mid-July) at a seed rate of 12–15 kg/ha. Row spacing 30 cm, plant-to-plant 10–15 cm. Seed treatment with Rhizobium culture improves nodulation on light soils.",
      status: "draft",
    },
  });

  await prisma.sopContent.create({
    data: {
      title: "Cumin Plant Protection Guidelines",
      audience: "farmer",
      category: "agronomy",
      cropCode: "CUMIN",
      operation: "plant_protection",
      season: "Rabi",
      contentBody:
        "Monitor for blight and wilt from 40 days after sowing, particularly under humid conditions. Maintain field sanitation and avoid excess irrigation at the flowering stage to reduce disease pressure.",
      sourceAttribution: "ICAR-Central Arid Zone Research Institute, Jodhpur",
      status: "technical_review",
    },
  });

  await prisma.sopContent.create({
    data: {
      title: "FPO Procurement Policy",
      audience: "fpo",
      category: "governance",
      operation: "procurement_policy",
      contentBody:
        "All lot procurement is executed against a graded quality declaration and a documented custody trail from farm-gate to warehouse. Payments are released against verified delivery, in line with FPO board-approved terms.",
      sourceAttribution: "FPO Board Resolution",
      approvingAuthority: "Marudhara Farmers Producer Company Ltd — Board",
      effectiveDate: new Date("2026-09-01"),
      status: "approved",
    },
  });

  await prisma.sopContent.create({
    data: {
      title: "Mustard Irrigation Schedule",
      audience: "farmer",
      category: "agronomy",
      cropCode: "MUSTARD",
      operation: "irrigation",
      season: "Rabi",
      contentBody:
        "First irrigation 25–30 days after sowing (pre-flowering), second at 55–60 days (pod formation). Avoid water stress during flowering, which most directly affects yield. Light irrigation is preferable to flooding on sandy loam soils.",
      sourceAttribution: "Rajasthan Agriculture Department — Package of Practices",
      approvingAuthority: "District Agriculture Officer, Bharatpur",
      effectiveDate: new Date("2026-08-01"),
      status: "published",
    },
  });

  await prisma.sopContent.create({
    data: {
      title: "Bajra Harvesting Guidelines",
      audience: "farmer",
      category: "agronomy",
      cropCode: "BAJRA",
      operation: "harvesting",
      season: "Kharif",
      contentBody:
        "Harvest when grain moisture is around 20–25% and ears turn golden-brown. Delayed harvest increases bird damage and shattering losses. Sun-dry threshed grain to 12% moisture before storage.",
      sourceAttribution: "Rajasthan Agriculture Department — Package of Practices",
      approvingAuthority: "District Agriculture Officer, Jodhpur",
      effectiveDate: new Date("2026-07-15"),
      status: "published",
    },
  });

  await prisma.sopContent.create({
    data: {
      title: "FPO Board Governance Manual",
      audience: "fpo",
      category: "governance",
      operation: "board_governance",
      contentBody:
        "The board meets quarterly with a quorum of two-thirds of directors. All procurement, pricing and payment decisions above the delegated financial threshold require board approval and are minuted.",
      sourceAttribution: "FPO Board Resolution",
      approvingAuthority: "Thar Kisan Producer Company Ltd — Board",
      effectiveDate: new Date("2026-06-01"),
      status: "published",
    },
  });

  // 200 farmers, 2 plots each = 400 plots
  const farmerCount = 200;
  let plotSeq = 1;

  const plotsByFpoCrop = new Map<string, string[]>(); // `${fpoId}:${cropCode}` -> plotIds

  const fposByDistrict = new Map<string, typeof fpos>();
  for (const f of fpos) {
    const list = fposByDistrict.get(f.district) ?? [];
    list.push(f);
    fposByDistrict.set(f.district, list);
  }
  const districtFarmerSeq = new Map<string, number>();

  for (let i = 0; i < farmerCount; i++) {
    const district = DISTRICTS[i % DISTRICTS.length];
    const village = pick(district.villages);
    const districtFpos = fposByDistrict.get(district.name) ?? fpos;
    const seq = districtFarmerSeq.get(district.name) ?? 0;
    districtFarmerSeq.set(district.name, seq + 1);
    const fpo = districtFpos[seq % districtFpos.length];

    const farmer = await prisma.farmer.create({
      data: {
        platformId: `RJ-FARM-${String(i + 1).padStart(5, "0")}`,
        name: `Farmer ${i + 1} (${village})`,
        mobileNumber: `98${String(10000000 + i).slice(0, 8)}`,
        gender: rand() > 0.15 ? "male" : "female",
        landholdingCategory: pick(LANDHOLDING_CATEGORIES),
        villageName: village,
        tehsil: district.tehsil,
        district: district.name,
      },
    });

    await prisma.membership.create({
      data: { farmerId: farmer.id, fpoId: fpo.id, status: "active" },
    });

    for (let p = 0; p < 2; p++) {
      const jitterLat = (rand() - 0.5) * 0.3; // ~±15km scatter around district centre
      const jitterLng = (rand() - 0.5) * 0.3;
      const lat = district.centerLat + jitterLat;
      const lng = district.centerLng + jitterLng;

      const areaHa = 0.05 + rand() * 4.5; // 0.05 – 4.55 ha, mirrors marginal-to-medium mix
      const areaSqm = Math.round(areaHa * 10000);
      const halfSideDeg = Math.sqrt(areaHa * 10000) / 2 / 111320; // rough metres-to-degrees

      const plot = await prisma.plot.create({
        data: {
          farmerId: farmer.id,
          plotCode: `RJ-PLOT-${String(plotSeq).padStart(6, "0")}`,
          villageName: village,
          areaSqm,
          belowRemoteSensingThreshold: areaHa < 0.1,
          boundaryGeoJson: JSON.stringify(squarePolygon(lat, lng, halfSideDeg)),
          centerLat: lat,
          centerLng: lng,
          irrigationSource: pick(IRRIGATION_SOURCES),
          soilTypeDeclared: pick(["sandy loam", "loam", "clay loam", "sandy"]),
        },
      });
      plotSeq++;

      // One crop cycle per plot, crop chosen loosely by district's dominant commodities
      const cropCode =
        district.name === "Bharatpur"
          ? pick(["MUSTARD", "BAJRA"])
          : pick(["GUAR", "BAJRA", "MOTH_BEAN", "CUMIN", "ISABGOL"]);
      const crop = cropRecords[cropCode];
      const variety = pick(crop.varieties);
      const status = pick(["planned", "sown", "sown", "harvested"]);

      await prisma.cropCycle.create({
        data: {
          plotId: plot.id,
          cropId: crop.id,
          varietyId: variety.id,
          season: "Rabi",
          seasonYearLabel: "2026-27",
          sowingDate: status === "planned" ? null : new Date("2026-10-15"),
          status,
          actualYieldKg: status === "harvested" ? Math.round(areaHa * (600 + rand() * 400)) : null,
        },
      });

      const key = `${fpo.id}:${cropCode}`;
      const list = plotsByFpoCrop.get(key) ?? [];
      list.push(plot.id);
      plotsByFpoCrop.set(key, list);
    }
  }

  // Lots — declared availability per FPO/crop (M05). Mirrors the crop mix each
  // FPO's district actually grows, one lot per state so the buyer view exercises
  // all three (forecast / committed / in_stock).
  const districtCrops: Record<string, string[]> = {
    Jodhpur: ["GUAR", "BAJRA", "MOTH_BEAN", "CUMIN", "ISABGOL"],
    Bharatpur: ["MUSTARD", "BAJRA"],
  };
  const LOT_STATES = ["forecast", "committed", "in_stock"];
  for (const fpo of fpos) {
    const crops = districtCrops[fpo.district] ?? [];
    for (const cropCode of crops) {
      const crop = cropRecords[cropCode];
      for (const state of LOT_STATES) {
        const quantityKg = Math.round(2000 + rand() * 18000);
        const readinessDate =
          state === "in_stock"
            ? null
            : new Date(2026, 9 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 27));
        const lot = await prisma.lot.create({
          data: {
            fpoId: fpo.id,
            cropId: crop.id,
            grade: state === "in_stock" ? pick(["FAQ", "Grade A", "Grade B"]) : null,
            quantityKg,
            availabilityState: state,
            readinessDate,
          },
        });

        // In-stock lots get real provenance: linked farmer deliveries and a
        // hash-chained custody trail (M07), so there is something to trace,
        // recall and verify against, not just an availability record.
        if (state === "in_stock") {
          const sourcePlotIds = (plotsByFpoCrop.get(`${fpo.id}:${cropCode}`) ?? []).slice(
            0,
            3,
          );
          let remainingKg = quantityKg;
          for (let i = 0; i < sourcePlotIds.length; i++) {
            const share =
              i === sourcePlotIds.length - 1
                ? remainingKg
                : Math.round(quantityKg / sourcePlotIds.length);
            remainingKg -= share;
            await prisma.lotComponent.create({
              data: { lotId: lot.id, plotId: sourcePlotIds[i], quantityKg: share },
            });
          }

          const events: {
            eventType: string;
            quantityInKg: number;
            quantityOutKg: number;
            location: string | null;
            actor: string | null;
          }[] = [
            {
              eventType: "delivery",
              quantityInKg: quantityKg,
              quantityOutKg: 0,
              location: `${fpo.district} collection centre`,
              actor: "Field CRP",
            },
            {
              eventType: "aggregation",
              quantityInKg: 0,
              quantityOutKg: 0,
              location: `${fpo.district} collection centre`,
              actor: null,
            },
            {
              eventType: "grading",
              quantityInKg: 0,
              quantityOutKg: 0,
              location: `${fpo.district} collection centre`,
              actor: "Empanelled grader",
            },
            {
              eventType: "storage",
              quantityInKg: 0,
              quantityOutKg: 0,
              location: `${fpo.legalName} warehouse`,
              actor: null,
            },
          ];

          let prevHash: string | null = null;
          let occurredAt = new Date(2026, 6, 1 + Math.floor(rand() * 20));
          for (const ev of events) {
            occurredAt = new Date(occurredAt.getTime() + 86400000); // +1 day each step
            const hash = computeEventHash(prevHash, {
              lotId: lot.id,
              eventType: ev.eventType,
              quantityInKg: ev.quantityInKg,
              quantityOutKg: ev.quantityOutKg,
              location: ev.location,
              actor: ev.actor,
              occurredAt: occurredAt.toISOString(),
            });
            await prisma.custodyEvent.create({
              data: {
                lotId: lot.id,
                eventType: ev.eventType,
                quantityInKg: ev.quantityInKg,
                quantityOutKg: ev.quantityOutKg,
                location: ev.location,
                actor: ev.actor,
                occurredAt,
                prevEventHash: prevHash,
                eventHash: hash,
              },
            });
            prevHash = hash;
          }
        }
      }
    }
  }

  // Demo login users
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demoFarmer = await prisma.farmer.findFirst({ orderBy: { platformId: "asc" } });
  let demoFarmerUserId: string | null = null;
  if (demoFarmer) {
    const demoFarmerUser = await prisma.user.create({
      data: {
        name: demoFarmer.name,
        phone: "9800000001",
        passwordHash,
        role: "FARMER",
        farmer: { connect: { id: demoFarmer.id } },
      },
    });
    demoFarmerUserId = demoFarmerUser.id;
  }

  await prisma.user.create({
    data: {
      name: "Meena Choudhary (Field Staff)",
      phone: "9800000010",
      passwordHash,
      role: "FPO_STAFF",
      fpoId: fpos[0].id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Rajendra Singh (FPO CEO)",
      phone: "9800000011",
      passwordHash,
      role: "FPO_ADMIN",
      fpoId: fpos[0].id,
    },
  });

  const buyerDefs = [
    {
      phone: "9800000020",
      name: "Ashok Traders — Procurement",
      legalName: "Ashok Traders Pvt Ltd",
      category: "trader",
      commoditiesOfInterest: "MUSTARD,BAJRA",
      operatingDistricts: "Jodhpur,Bharatpur",
    },
    {
      phone: "9800000021",
      name: "Marwar Agro Exports — Procurement",
      legalName: "Marwar Agro Exports Ltd",
      category: "exporter",
      commoditiesOfInterest: "CUMIN,ISABGOL,GUAR",
      operatingDistricts: "Jodhpur",
    },
    {
      phone: "9800000022",
      name: "Bharatpur Oil Mills — Procurement",
      legalName: "Bharatpur Oil Mills Pvt Ltd",
      category: "processor",
      commoditiesOfInterest: "MUSTARD",
      operatingDistricts: "Bharatpur",
    },
    {
      phone: "9800000023",
      name: "Thar Guar Processors — Procurement",
      legalName: "Thar Guar Processors Ltd",
      category: "processor",
      commoditiesOfInterest: "GUAR,MOTH_BEAN",
      operatingDistricts: "Jodhpur",
    },
  ];
  const buyers = [];
  for (const b of buyerDefs) {
    const user = await prisma.user.create({
      data: { name: b.name, phone: b.phone, passwordHash, role: "BUYER" },
    });
    buyers.push(
      await prisma.buyer.create({
        data: {
          userId: user.id,
          legalName: b.legalName,
          category: b.category,
          commoditiesOfInterest: b.commoditiesOfInterest,
          operatingDistricts: b.operatingDistricts,
        },
      }),
    );
  }

  // Buyer offers, contracts and payments (M06) across every in-stock lot —
  // a realistic transaction history to browse (multiple offers per lot in
  // different states, contracts at every payment stage), not just one demo
  // record. The create/accept/pay flow is fully live and can be exercised
  // further from the UI on top of this.
  const OFFER_MESSAGES = [
    "Interested in immediate pickup, can inspect this week.",
    "Can we agree on a rate closer to the mandi modal price?",
    "Looking for FAQ grade only, please confirm quality certificate.",
    "Standing order — would like to discuss a season-long supply arrangement.",
    "Transport arranged from our side, ready to close this week.",
    null,
    null,
  ];
  const PAYMENT_METHODS = ["upi", "neft", "cash"];

  const inStockLots = await prisma.lot.findMany({
    where: { availabilityState: "in_stock" },
    include: { crop: true, fpo: true },
  });

  const fpoNotifyUserIds = new Map<string, string[]>();
  for (const fpo of fpos) {
    const staff = await prisma.user.findMany({
      where: { fpoId: fpo.id, role: { in: ["FPO_STAFF", "FPO_ADMIN"] } },
      select: { id: true },
    });
    fpoNotifyUserIds.set(
      fpo.id,
      staff.map((s) => s.id),
    );
  }

  let txDay = new Date("2026-07-10");
  function nextTxDate() {
    txDay = new Date(txDay.getTime() + (4 + Math.floor(rand() * 3)) * 86400000);
    return txDay;
  }

  async function notify(
    userId: string,
    title: string,
    body: string,
    relatedUrl: string,
    createdAt: Date,
  ) {
    const n = await prisma.notification.create({
      data: { userId, title, body, relatedUrl, createdAt, status: "read", readAt: createdAt },
    });
    await prisma.deliveryAttempt.create({
      data: { notificationId: n.id, channel: "in_app", status: "sent" },
    });
  }

  let contractsCreated = 0;
  for (const lot of inStockLots) {
    const range = PRICE_RANGES[lot.crop.code];
    const basePricePerKg = (range.min + range.max) / 2 / 100;

    const matchingBuyers = buyers.filter(
      (b) =>
        (b.commoditiesOfInterest ?? "").split(",").includes(lot.crop.code) &&
        (b.operatingDistricts ?? "").split(",").includes(lot.fpo.district),
    );
    if (matchingBuyers.length === 0) continue;

    const fpoUsers = fpoNotifyUserIds.get(lot.fpoId) ?? [];
    let committedKg = 0;
    const offerCount = 2 + Math.floor(rand() * 2); // 2-3 offers per in-stock lot

    for (let i = 0; i < offerCount; i++) {
      const buyer = matchingBuyers[i % matchingBuyers.length];
      const qtyShare = 0.12 + rand() * 0.2; // 12-32% of lot per offer
      const quantityKg = Math.min(
        Math.round(lot.quantityKg * qtyShare),
        Math.max(lot.quantityKg - committedKg, 200),
      );
      const pricePerKgRs = Math.round(basePricePerKg * (0.88 + rand() * 0.28) * 100) / 100;
      const offerDate = nextTxDate();

      // First matched offer per lot is accepted (capacity allowing), the next
      // is rejected, any further ones stay pending awaiting an FPO decision —
      // a realistic mix instead of every offer landing in the same state.
      const canAccept = i === 0 && committedKg + quantityKg <= lot.quantityKg;
      const status = canAccept ? "accepted" : i === 1 ? "rejected" : "pending";

      const offer = await prisma.offer.create({
        data: {
          lotId: lot.id,
          buyerId: buyer.id,
          quantityKg,
          pricePerKgRs,
          message: pick(OFFER_MESSAGES),
          status,
          createdAt: offerDate,
        },
      });

      for (const uid of fpoUsers) {
        await notify(
          uid,
          "New offer received",
          `${buyer.legalName} offered ₹${pricePerKgRs}/kg for ${quantityKg.toLocaleString("en-IN")} kg of ${lot.crop.name}.`,
          "/fpo/offers",
          offerDate,
        );
      }

      if (status === "rejected") {
        await notify(
          buyer.userId,
          "Your offer was declined",
          `Your offer on ${lot.crop.name} (${quantityKg.toLocaleString("en-IN")} kg) was declined by the FPO.`,
          "/buyer/offers",
          new Date(offerDate.getTime() + 86400000),
        );
        continue;
      }
      if (status === "pending") continue;

      committedKg += quantityKg;
      const totalValueRs = Math.round(quantityKg * pricePerKgRs * 100) / 100;
      const contractDate = new Date(offerDate.getTime() + 86400000);
      const payFrac = rand(); // spread contracts across unpaid / partial / paid-in-full
      const contract = await prisma.contract.create({
        data: {
          offerId: offer.id,
          fpoId: lot.fpoId,
          buyerId: buyer.id,
          cropId: lot.cropId,
          quantityKg,
          pricePerKgRs,
          totalValueRs,
          status: payFrac > 0.85 ? "completed" : "active",
          createdAt: contractDate,
        },
      });
      contractsCreated++;

      await notify(
        buyer.userId,
        "Your offer was accepted",
        `A contract worth ₹${totalValueRs.toLocaleString("en-IN")} has been created.`,
        `/buyer/contracts/${contract.id}`,
        contractDate,
      );
      for (const uid of fpoUsers) {
        await notify(
          uid,
          "Contract created",
          `Contract with ${buyer.legalName} for ${quantityKg.toLocaleString("en-IN")} kg of ${lot.crop.name} worth ₹${totalValueRs.toLocaleString("en-IN")}.`,
          `/fpo/contracts/${contract.id}`,
          contractDate,
        );
      }

      if (payFrac > 0.3) {
        // Partial advance payment
        const advancePct = 0.3 + rand() * 0.3;
        const advanceRs = Math.round(totalValueRs * advancePct * 100) / 100;
        const payDate = new Date(contractDate.getTime() + (1 + Math.floor(rand() * 4)) * 86400000);
        await prisma.payment.create({
          data: { contractId: contract.id, amountRs: advanceRs, method: pick(PAYMENT_METHODS), paidAt: payDate },
        });
        for (const uid of fpoUsers) {
          await notify(
            uid,
            "Payment received",
            `₹${advanceRs.toLocaleString("en-IN")} received from ${buyer.legalName} against contract ${contract.id.slice(-6).toUpperCase()}.`,
            `/fpo/contracts/${contract.id}`,
            payDate,
          );
        }

        if (payFrac > 0.65) {
          // Final settling payment closes the contract out.
          const balanceRs = Math.round((totalValueRs - advanceRs) * 100) / 100;
          const finalDate = new Date(payDate.getTime() + (2 + Math.floor(rand() * 5)) * 86400000);
          await prisma.payment.create({
            data: { contractId: contract.id, amountRs: balanceRs, method: pick(PAYMENT_METHODS), paidAt: finalDate },
          });
          for (const uid of fpoUsers) {
            await notify(
              uid,
              "Payment received",
              `Final payment of ₹${balanceRs.toLocaleString("en-IN")} received from ${buyer.legalName} — contract ${contract.id.slice(-6).toUpperCase()} settled.`,
              `/fpo/contracts/${contract.id}`,
              finalDate,
            );
          }
        }
      }
    }
  }
  console.log(`Generated ${contractsCreated} contracts across ${inStockLots.length} in-stock lots.`);

  await prisma.user.create({
    data: {
      name: "Platform Admin",
      phone: "9800000099",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      name: "Dept. of Agriculture — District Officer",
      phone: "9800000090",
      passwordHash,
      role: "GOVERNMENT",
    },
  });

  // Notification preferences (M11) — default settings for every user; the
  // demo farmer gets a couple of pre-existing notifications so the bell/list
  // isn't empty before the live advisory/offer flows generate real ones.
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const u of allUsers) {
    await prisma.notificationPreference.create({
      data: { userId: u.id, preferredChannel: "in_app", quietHoursStart: 21, quietHoursEnd: 6, dailyCap: 5 },
    });
  }

  if (demoFarmerUserId) {
    const n1 = await prisma.notification.create({
      data: {
        userId: demoFarmerUserId,
        title: "Welcome to the Rajasthan Agri-Intelligence Platform",
        body: "Check My Farm for your current advisories.",
        relatedUrl: "/my-farm",
        status: "read",
        readAt: new Date(),
      },
    });
    await prisma.deliveryAttempt.create({
      data: { notificationId: n1.id, channel: "in_app", status: "sent" },
    });

    const n2 = await prisma.notification.create({
      data: {
        userId: demoFarmerUserId,
        title: "Frost warning — protect your crop",
        body: "A cold spell is forecast this week. Consider light irrigation ahead of frost-risk nights.",
        severe: true,
        relatedUrl: "/my-farm",
      },
    });
    await prisma.deliveryAttempt.create({
      data: { notificationId: n2.id, channel: "in_app", status: "sent" },
    });
  }

  const counts = {
    farmers: await prisma.farmer.count(),
    plots: await prisma.plot.count(),
    fpos: await prisma.fPO.count(),
    buyers: await prisma.buyer.count(),
    cropCycles: await prisma.cropCycle.count(),
    users: await prisma.user.count(),
    mandis: await prisma.mandiMaster.count(),
    priceObservations: await prisma.priceObservation.count(),
    lots: await prisma.lot.count(),
    offers: await prisma.offer.count(),
    contracts: await prisma.contract.count(),
    payments: await prisma.payment.count(),
    lotComponents: await prisma.lotComponent.count(),
    custodyEvents: await prisma.custodyEvent.count(),
    facilities: await prisma.facility.count(),
    transporters: await prisma.transporter.count(),
    knowledgeItems: await prisma.sopContent.count(),
    notifications: await prisma.notification.count(),
    notificationPreferences: await prisma.notificationPreference.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
