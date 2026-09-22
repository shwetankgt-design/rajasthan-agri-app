import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NAV_GROUPS, ROLE_LABELS } from "@/lib/nav";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, status: "unread" },
  });

  return (
    <AppShell
      groups={groups}
      userName={user.name}
      roleLabel={ROLE_LABELS[user.role] ?? user.role}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
