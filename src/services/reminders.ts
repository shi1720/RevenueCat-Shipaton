import { Platform } from "react-native";
import type { Project } from "../domain/types";

const CHANNEL = "project-reminders";
const unsupported = () =>
  new Error(
    "Reminders are available in the iOS and Android apps. This browser cannot schedule a reliable device reminder.",
  );

export async function scheduleReminder(
  project: Project,
  date: Date,
): Promise<string> {
  if (Platform.OS === "web") throw unsupported();
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    throw new Error("Choose a reminder time in the future.");
  if (project.status === "finished")
    throw new Error(
      "This project is finished. Reopen it before adding a reminder.",
    );
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Gentle project reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      description: "Reminders you choose for your creative projects.",
      sound: "default",
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  const allowed = () =>
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!allowed() && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  if (!allowed())
    throw new Error(
      "Notifications are disabled. Enable notifications for Unpause in your device settings, then try again.",
    );
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `A little time for ${project.title}`,
      body:
        project.checkpoints[0]?.nextStep ||
        "Your next small step is waiting. Pick it up when you are ready.",
      data: { projectId: project.id },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL,
    },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  if (Platform.OS === "web") throw unsupported();
  if (!id.trim()) return;
  const Notifications = await import("expo-notifications");
  await Notifications.cancelScheduledNotificationAsync(id);
}
