import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationRow } from "@/components/NotificationRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay up to date on offers, contracts, payments and advisories."
      />

      <div className="space-y-3">
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            id={n.id}
            title={n.title}
            body={n.body}
            status={n.status}
            severe={n.severe}
            relatedUrl={n.relatedUrl}
            createdAt={n.createdAt.toISOString()}
          />
        ))}
        {notifications.length === 0 && <EmptyState message="No notifications yet." />}
      </div>
    </div>
  );
}
