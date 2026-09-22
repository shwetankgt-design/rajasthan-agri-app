"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function NotificationRow({
  id,
  title,
  body,
  status,
  severe,
  relatedUrl,
  createdAt,
}: {
  id: string;
  title: string;
  body: string;
  status: string;
  severe: boolean;
  relatedUrl: string | null;
  createdAt: string;
}) {
  const router = useRouter();

  async function markRead() {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }

  return (
    <div
      className={`rounded-xl2 border p-4 shadow-card ${status === "unread" ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-slate-800">
          {severe && (
            <span className="mr-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
              Severe
            </span>
          )}
          {title}
        </div>
        <span className="whitespace-nowrap text-xs text-slate-500">
          {new Date(createdAt).toLocaleString("en-IN")}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
      <div className="mt-2 flex items-center gap-3">
        {relatedUrl && (
          <Link href={relatedUrl} className="text-xs font-medium text-brand-700 hover:underline">
            View →
          </Link>
        )}
        {status === "unread" && (
          <button onClick={markRead} className="text-xs text-slate-500 hover:text-slate-700">
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}
