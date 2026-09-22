import { ReactNode } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Data tables stay tabular on every breakpoint and scroll horizontally on
 * narrow screens rather than reflowing into unreadable columns — the row-wise
 * comparison is the point of these screens. `minWidth` can be relaxed for
 * narrow tables that genuinely fit on a phone.
 */
export function TableCard({
  children,
  minWidth = "40rem",
  scrollHint = true,
}: {
  children: ReactNode;
  minWidth?: string;
  scrollHint?: boolean;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>{children}</div>
        </div>
      </div>
      {scrollHint && (
        <p className="mt-1.5 text-xs text-slate-400 sm:hidden">
          Swipe the table sideways to see all columns.
        </p>
      )}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full text-left text-sm">{children}</table>;
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cx("px-3 py-3 font-medium sm:px-4", className)}>{children}</th>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cx("transition-colors hover:bg-slate-50", className)}>{children}</tr>;
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cx("px-3 py-3 text-slate-700 sm:px-4", className)}>{children}</td>;
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}
