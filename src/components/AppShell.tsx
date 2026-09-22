"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { LogoutButton } from "@/components/LogoutButton";
import type { NavGroup } from "@/lib/nav";

export function AppShell({
  groups,
  userName,
  roleLabel,
  unreadCount,
  children,
}: {
  groups: NavGroup[];
  userName: string;
  roleLabel: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-600 text-[11px] font-bold tracking-tight text-white">
            GT
          </span>
          <span className="truncate text-sm font-semibold text-slate-900">Agri-Intelligence</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2.5 border-b border-slate-100 px-5 py-5 lg:flex">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold tracking-tight text-white">
              GT
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight text-slate-900">
                Agri-Intelligence
              </div>
              <div className="truncate text-xs text-slate-400">Grant Thornton Bharat</div>
            </div>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          name={item.icon}
                          className={`h-4 w-4 flex-shrink-0 ${active ? "text-brand-600" : "text-slate-400"}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-3">
            <Link
              href="/notifications"
              onClick={() => setMobileOpen(false)}
              className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 font-mono text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{userName}</div>
                <div className="truncate text-xs text-slate-400">{roleLabel}</div>
              </div>
              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-end gap-3 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur lg:flex">
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.6-1.6a2 2 0 0 1-.6-1.4V11a5.8 5.8 0 0 0-4-5.5V5a1.8 1.8 0 1 0-3.6 0v.5A5.8 5.8 0 0 0 6.2 11v3a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <LogoutButton />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
