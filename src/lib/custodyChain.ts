import { createHash } from "node:crypto";

export type CustodyEventPayload = {
  lotId: string;
  eventType: string;
  quantityInKg: number;
  quantityOutKg: number;
  location: string | null;
  actor: string | null;
  occurredAt: string; // ISO string, so the hash is stable regardless of Date object identity
};

export function computeEventHash(
  prevEventHash: string | null,
  payload: CustodyEventPayload,
): string {
  const canonical = JSON.stringify({ prevEventHash, ...payload });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Recomputes every hash in a custody chain from scratch and compares against
 * what's stored. Returns the index of the first mismatch, or -1 if the whole
 * chain verifies — i.e. no historical event was altered after the fact.
 */
export function verifyChain(
  events: Array<{
    lotId: string;
    eventType: string;
    quantityInKg: number;
    quantityOutKg: number;
    location: string | null;
    actor: string | null;
    occurredAt: Date;
    prevEventHash: string | null;
    eventHash: string;
  }>,
): number {
  let prevHash: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const expected = computeEventHash(prevHash, {
      lotId: e.lotId,
      eventType: e.eventType,
      quantityInKg: e.quantityInKg,
      quantityOutKg: e.quantityOutKg,
      location: e.location,
      actor: e.actor,
      occurredAt: e.occurredAt.toISOString(),
    });
    if (expected !== e.eventHash || e.prevEventHash !== prevHash) {
      return i;
    }
    prevHash = e.eventHash;
  }
  return -1;
}
