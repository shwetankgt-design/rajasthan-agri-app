import { prisma } from "./prisma";
import type { CurrentUser } from "./auth";

/**
 * Writes a personal-data access/modification audit entry (FR-M12-03). Called
 * from a handful of sensitive read/write paths — farmer detail views and
 * financial actions — not from every code path in the app. That's a real
 * coverage gap, flagged in the module summary rather than silently claimed
 * as complete.
 */
export async function recordAudit(params: {
  actor: CurrentUser | null;
  action: string;
  purpose?: string;
  targetType: string;
  targetId: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actor?.id,
      actorRole: params.actor?.role,
      action: params.action,
      purpose: params.purpose,
      targetType: params.targetType,
      targetId: params.targetId,
    },
  });
}
