export type NavItem = {
  href: string;
  label: string;
  roles: string[];
  icon: IconName;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type IconName =
  | "home"
  | "users"
  | "map"
  | "chart"
  | "directory"
  | "price"
  | "inbox"
  | "contract"
  | "trace"
  | "farm"
  | "search"
  | "layers"
  | "offers"
  | "warehouse"
  | "truck"
  | "route"
  | "book"
  | "edit"
  | "shield"
  | "log"
  | "database"
  | "landmark"
  | "user-shield";

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "home",
        roles: ["FARMER", "FPO_STAFF", "FPO_ADMIN", "BUYER", "GOVERNMENT", "ADMIN"],
      },
      { href: "/my-farm", label: "My Farm", icon: "farm", roles: ["FARMER"] },
      { href: "/market-prices", label: "Market Prices", icon: "price", roles: ["FARMER"] },
    ],
  },
  {
    label: "Registry",
    items: [
      { href: "/farmers", label: "Farmers", icon: "users", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/plots", label: "Plots", icon: "map", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
    ],
  },
  {
    label: "FPO Workbench",
    items: [
      { href: "/fpo/output", label: "Expected Output", icon: "chart", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/fpo/buyers", label: "Buyer Directory", icon: "directory", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/fpo/prices", label: "Mandi Prices", icon: "price", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/fpo/offers", label: "Incoming Offers", icon: "inbox", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/fpo/contracts", label: "Contracts", icon: "contract", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
      { href: "/fpo/lots", label: "Lots & Traceability", icon: "trace", roles: ["FPO_STAFF", "FPO_ADMIN", "ADMIN"] },
    ],
  },
  {
    label: "Buyer Workbench",
    items: [
      { href: "/buyer/fpos", label: "FPO Discovery", icon: "search", roles: ["BUYER", "ADMIN"] },
      { href: "/buyer/lots", label: "Availability", icon: "layers", roles: ["BUYER", "ADMIN"] },
      { href: "/buyer/offers", label: "My Offers", icon: "offers", roles: ["BUYER"] },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { href: "/facilities", label: "Facilities", icon: "warehouse", roles: ["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"] },
      { href: "/transporters", label: "Transporters", icon: "truck", roles: ["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"] },
      { href: "/logistics/freight-estimate", label: "Freight Estimate", icon: "route", roles: ["FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"] },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/knowledge", label: "Knowledge & SOP", icon: "book", roles: ["FARMER", "FPO_STAFF", "FPO_ADMIN", "BUYER", "ADMIN"] },
      { href: "/my-data", label: "My Data", icon: "shield", roles: ["FARMER"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/knowledge", label: "Manage Content", icon: "edit", roles: ["ADMIN"] },
      { href: "/admin/data-requests", label: "Data Requests", icon: "user-shield", roles: ["ADMIN"] },
      { href: "/admin/audit", label: "Audit Log", icon: "log", roles: ["ADMIN"] },
      { href: "/admin/master-data", label: "Master Data", icon: "database", roles: ["ADMIN"] },
    ],
  },
  {
    label: "Government",
    items: [
      { href: "/government", label: "Government Dashboard", icon: "landmark", roles: ["GOVERNMENT", "ADMIN"] },
    ],
  },
];

// Flattened for code that just needs a role-filtered list (kept for compatibility).
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const ROLE_LABELS: Record<string, string> = {
  FARMER: "Farmer",
  FPO_STAFF: "FPO Field Staff",
  FPO_ADMIN: "FPO Administrator",
  BUYER: "Buyer",
  GOVERNMENT: "Government Officer",
  ADMIN: "Platform Administrator",
};
