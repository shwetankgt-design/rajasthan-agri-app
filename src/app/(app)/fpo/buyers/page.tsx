import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_LABELS: Record<string, string> = {
  processor: "Processor",
  trader: "Trader",
  exporter: "Exporter",
  retailer: "Retailer",
  institutional: "Institutional Buyer",
};

export default async function BuyerDirectoryPage() {
  const user = await requireRole(["FPO_STAFF", "FPO_ADMIN", "ADMIN"]);

  let myDistrict: string | null = null;
  if (user.fpoId) {
    const fpo = await prisma.fPO.findUnique({ where: { id: user.fpoId } });
    myDistrict = fpo?.district ?? null;
  }

  const buyers = await prisma.buyer.findMany({ orderBy: { legalName: "asc" } });

  return (
    <div>
      <PageHeader
        title="Buyer Directory"
        description={`Institutional and private buyers registered on the platform.${
          myDistrict ? ` Buyers marked below already operate in ${myDistrict}.` : ""
        }`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {buyers.map((buyer) => {
          const districts = (buyer.operatingDistricts ?? "")
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean);
          const commodities = (buyer.commoditiesOfInterest ?? "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          const matchesMyDistrict = myDistrict ? districts.includes(myDistrict) : false;

          return (
            <Card key={buyer.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{buyer.legalName}</div>
                    <div className="text-xs text-slate-500">
                      {CATEGORY_LABELS[buyer.category] ?? buyer.category}
                    </div>
                  </div>
                  {matchesMyDistrict && <Badge tone="brand">Operates in your district</Badge>}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {commodities.map((c) => (
                    <Badge key={c} tone="neutral">
                      {c.replaceAll("_", " ")}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Operating districts: {districts.join(", ") || "—"}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
