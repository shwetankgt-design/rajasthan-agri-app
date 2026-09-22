import type { CurrentUser } from "./auth";

export function audiencesFor(role: string): string[] {
  switch (role) {
    case "FARMER":
      return ["farmer", "all"];
    case "FPO_STAFF":
    case "FPO_ADMIN":
      return ["fpo", "all"];
    case "BUYER":
      return ["buyer", "all"];
    default:
      return ["farmer", "fpo", "buyer", "all"];
  }
}

export function canReadPublished(user: CurrentUser): string[] {
  return audiencesFor(user.role);
}
