import { prisma } from "./prisma";

const SIMULATED_CHANNELS = new Set(["whatsapp", "sms", "ivr", "email"]);

function isInQuietHours(hour: number, start: number, end: number): boolean {
  // Quiet hours window can wrap past midnight (e.g. 21 -> 6).
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/**
 * Creates a notification, applying the frequency cap and quiet-hours rules
 * from the user's NotificationPreference — unless `severe` is set, which
 * bypasses both (severe weather warnings must always reach the user;
 * FR-M11-04's explicit exception). Also writes a DeliveryAttempt per channel:
 * only "in_app" is a real delivery here, the rest are simulated.
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  severe?: boolean;
  relatedUrl?: string;
}): Promise<{ created: boolean; reason?: string }> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: params.userId },
  });
  const dailyCap = pref?.dailyCap ?? 5;
  const quietStart = pref?.quietHoursStart ?? 21;
  const quietEnd = pref?.quietHoursEnd ?? 6;
  const preferredChannel = pref?.preferredChannel ?? "in_app";

  const now = new Date();

  if (!params.severe) {
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const recentCount = await prisma.notification.count({
      where: { userId: params.userId, severe: false, createdAt: { gte: oneDayAgo } },
    });
    if (recentCount >= dailyCap) {
      return { created: false, reason: "daily_cap_reached" };
    }

    if (isInQuietHours(now.getHours(), quietStart, quietEnd)) {
      // We still record the notification (it will be visible in-app on next
      // read), but the delivery attempt itself is deferred, not sent.
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          body: params.body,
          severe: false,
          relatedUrl: params.relatedUrl,
        },
      });
      await prisma.deliveryAttempt.create({
        data: {
          notificationId: notification.id,
          channel: preferredChannel,
          status: "deferred_quiet_hours",
        },
      });
      return { created: true, reason: "deferred_quiet_hours" };
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      body: params.body,
      severe: params.severe ?? false,
      relatedUrl: params.relatedUrl,
    },
  });

  await prisma.deliveryAttempt.create({
    data: {
      notificationId: notification.id,
      channel: "in_app",
      status: "sent",
    },
  });

  if (preferredChannel !== "in_app" && SIMULATED_CHANNELS.has(preferredChannel)) {
    await prisma.deliveryAttempt.create({
      data: {
        notificationId: notification.id,
        channel: preferredChannel,
        status: "simulated_sent",
      },
    });
  }

  return { created: true };
}
