import type { CurrentUser } from "./auth";

/**
 * FPO-scoped tenancy rule used across every FPO-workbench page: FPO_STAFF and
 * FPO_ADMIN only ever see their own FPO's data; ADMIN sees everything. Centralised
 * here so the rule is applied consistently rather than reimplemented per page.
 */
export function fpoScopeFilter(user: CurrentUser): { fpoId: string } | undefined {
  if (user.role === "ADMIN") return undefined;
  if (!user.fpoId) return { fpoId: "__none__" }; // no FPO assigned → sees nothing
  return { fpoId: user.fpoId };
}
