import type { IconName } from "@/lib/nav";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  users: "M17 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21M15 3.5a4 4 0 1 1 0 7.9M21 21v-1.5a4 4 0 0 0-3-3.87M11 9.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  map: "M9 4 3 6.5v13L9 17m0-13 6 2m-6-2v13m6-11 6-2.5v13L15 17m0-13v13m0-13 6 2",
  chart: "M4 20V10m6 10V4m6 16v-7",
  directory: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM8 4v16M13 9h4M13 13h4",
  price: "M4 4h6l10 10-6 6L4 14V4Zm3.5 3.5h.01",
  inbox: "M4 12h4l2 3h4l2-3h4M4 12 5.5 5h13L20 12M4 12v6a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-6",
  contract: "M8 4h8a1 1 0 0 1 1 1v14l-3-2-2 2-2-2-3 2V5a1 1 0 0 1 1-1Zm1 4h6m-6 3h6m-6 3h3",
  trace: "M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2 2m7.4 7.4 2 2M6.3 17.7l2-2m7.4-7.4 2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  farm: "M4 21V10l8-6 8 6v11H4Zm5-5v5h6v-5a3 3 0 0 0-6 0Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm9 2-4.35-4.35",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
  offers: "M20 12v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6M3 8l9-5 9 5-9 5-9-5Zm9 5v9",
  warehouse: "M3 21V9l9-6 9 6v12H3Zm4 0v-7h10v7",
  truck: "M2 8h11v9H2V8Zm11 3h4l3 3v3h-7v-6ZM6 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14-14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17l6.5-6.5a3 3 0 0 1 4.5-4",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  log: "M4 5h16M4 12h16M4 19h10M18 17l2 2 2-2",
  database: "M12 5c4.4 0 8-1.1 8-2.5S16.4 0 12 0 4 1.1 4 2.5 7.6 5 12 5Zm8-2.5v7c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-7m16 7v7c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-7",
  landmark: "M3 21h18M4 21V10l8-5 8 5v11M9 21v-7m6 7v-7M4 10h16",
  "user-shield": "M9 21v-2a4 4 0 0 1 4-4h1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 1-3 1v2.5c0 2 1.3 3.4 3 4 1.7-.6 3-2 3-4V13l-3-1Z",
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
