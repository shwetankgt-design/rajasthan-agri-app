import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableCard, Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/Table";

export default async function MasterDataPage() {
  await requireRole(["ADMIN"]);

  const [crops, mandis, fpos] = await Promise.all([
    prisma.crop.findMany({ include: { varieties: true }, orderBy: { name: "asc" } }),
    prisma.mandiMaster.findMany({ orderBy: { name: "asc" } }),
    prisma.fPO.findMany({ orderBy: { legalName: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Master Data"
        description="Reference data consumed across every module — crop and variety master, mandi master, and FPO administrative hierarchy."
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Crop &amp; Variety Master
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Crop</Th>
            <Th>Code</Th>
            <Th>Varieties</Th>
            <Th>Indicative yield (kg/ha)</Th>
          </Thead>
          <Tbody>
            {crops.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-800">{c.name}</Td>
                <Td className="font-mono text-xs">{c.code}</Td>
                <Td>{c.varieties.map((v) => v.name).join(", ")}</Td>
                <Td className="font-mono tabular-nums">{c.indicativeYieldKgHa ?? "—"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Mandi Master</h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>Mandi</Th>
            <Th>District</Th>
          </Thead>
          <Tbody>
            {mandis.map((m) => (
              <Tr key={m.id}>
                <Td>{m.name}</Td>
                <Td>{m.district}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Administrative Hierarchy — FPOs
      </h2>
      <TableCard>
        <Table>
          <Thead>
            <Th>FPO</Th>
            <Th>Registration</Th>
            <Th>District</Th>
          </Thead>
          <Tbody>
            {fpos.map((f) => (
              <Tr key={f.id}>
                <Td>{f.legalName}</Td>
                <Td className="font-mono text-xs">{f.registrationNumber}</Td>
                <Td>{f.district}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableCard>
    </div>
  );
}
