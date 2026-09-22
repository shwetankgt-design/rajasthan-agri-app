import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";

export default async function TransportersPage() {
  await requireRole(["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"]);

  const transporters = await prisma.transporter.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Transporter Registry" description="Vehicle classes, service districts and rate cards." />

      <TableCard>
        <Table>
          <Thead>
            <Th>Transporter</Th>
            <Th>Vehicle classes</Th>
            <Th>Service districts</Th>
            <Th>Cold chain</Th>
            <Th>Rate (Rs/km)</Th>
          </Thead>
          <Tbody>
            {transporters.map((t) => (
              <Tr key={t.id}>
                <Td className="font-medium text-slate-800">{t.name}</Td>
                <Td>{t.vehicleClasses.replaceAll(",", ", ")}</Td>
                <Td>{t.serviceDistricts.replaceAll(",", ", ")}</Td>
                <Td>
                  <Badge tone={t.coldChainCapable ? "info" : "neutral"}>{t.coldChainCapable ? "Yes" : "No"}</Badge>
                </Td>
                <Td className="font-mono tabular-nums">₹{t.ratePerKmRs.toFixed(0)}</Td>
              </Tr>
            ))}
            {transporters.length === 0 && <EmptyRow colSpan={5} message="No transporters registered yet." />}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
