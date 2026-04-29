import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import i18n from "@/i18n/i18n";
import { formatLocalYYYYMMDD, getStreak } from "@/services/StreakService";

const STORAGE = {
    askedPermission: "financeit/notifications/askedPermission",
    dailyTime: "financeit/notifications/dailyTime", // HH:MM
    dailyReminderId: "financeit/notifications/dailyReminderId",
    streakWarningId: "financeit/notifications/streakWarningId",
    activeUserId: "financeit/activeUserId",
};

const DAILY_TASK = "financeit-notifications-daily";

function parseHHMM(raw: string | null): { hour: number; minute: number } {
    const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(raw ?? "");
    if (!m) return { hour: 18, minute: 0 };
    const hour = Math.max(0, Math.min(23, Number(m[1])));
    const minute = Math.max(0, Math.min(59, Number(m[2])));
    return { hour, minute };
}

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function reminderBody(): string {
    const keys = [
        "notifications.reminder1",
        "notifications.reminder2",
        "notifications.reminder3",
    ];
    return i18n.t(randomPick(keys));
}

function warningBody(): string {
    const keys = ["notifications.warning1", "notifications.warning2"];
    return i18n.t(randomPick(keys));
}

function achievementBody(): string {
    const keys = ["notifications.achievement1", "notifications.achievement2"];
    return i18n.t(randomPick(keys));
}

function title(): string {
    return i18n.t("notifications.title");
}

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

TaskManager.defineTask(DAILY_TASK, async () => {
    try {
        const userId = (await AsyncStorage.getItem(STORAGE.activeUserId)) ?? "";
        if (!userId) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        
        await ensureDailyReminderScheduled();

        
        const streak = await getStreak(userId);
        const today = formatLocalYYYYMMDD(new Date());
        if (streak.lastActiveDate !== today) {
            await scheduleStreakWarningAt({ hour: 21, minute: 0 });
        }

        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export async function requestNotificationPermissions(): Promise<boolean> {
    const asked = await AsyncStorage.getItem(STORAGE.askedPermission);

    
    if (Platform.OS === "web") return false;

    if (!asked) {
        await AsyncStorage.setItem(STORAGE.askedPermission, "1");
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
}

export async function setActiveUserIdForNotifications(userId: string | null) {
    if (!userId) {
        await AsyncStorage.removeItem(STORAGE.activeUserId);
        return;
    }
    await AsyncStorage.setItem(STORAGE.activeUserId, userId);
}

export async function setPreferredDailyTime(params: {
    hour: number;
    minute: number;
}) {
    const hour = Math.max(0, Math.min(23, params.hour));
    const minute = Math.max(0, Math.min(59, params.minute));
    await AsyncStorage.setItem(
        STORAGE.dailyTime,
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );

    await ensureDailyReminderScheduled(true);
}

export async function ensureDailyReminderScheduled(forceReschedule?: boolean) {
    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    const time = parseHHMM(await AsyncStorage.getItem(STORAGE.dailyTime));

    const existingId = await AsyncStorage.getItem(STORAGE.dailyReminderId);
    if (existingId && !forceReschedule) {
        return;
    }

    if (existingId) {
        try {
            await Notifications.cancelScheduledNotificationAsync(existingId);
        } catch {
            
        }
    }

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: title(),
            body: reminderBody(),
            sound: undefined,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
        },
    });

    await AsyncStorage.setItem(STORAGE.dailyReminderId, id);
}

export async function scheduleStreakWarningAt(params: {
    hour: number;
    minute: number;
}) {
    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    const now = new Date();
    const next = new Date();
    next.setHours(params.hour, params.minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
    }

    const existingId = await AsyncStorage.getItem(STORAGE.streakWarningId);
    if (existingId) {
        try {
            await Notifications.cancelScheduledNotificationAsync(existingId);
        } catch {
            
        }
    }

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: title(),
            body: warningBody(),
            sound: undefined,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: next,
        },
    });

    await AsyncStorage.setItem(STORAGE.streakWarningId, id);
}

export async function triggerAchievementNotification() {
    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: title(),
            body: achievementBody(),
            sound: undefined,
        },
        trigger: null,
    });
}

export async function registerNotificationBackgroundTasks() {
    if (Platform.OS === "web") return;

    const status = await BackgroundFetch.getStatusAsync();
    if (
        status === BackgroundFetch.BackgroundFetchStatus.Denied ||
        status === BackgroundFetch.BackgroundFetchStatus.Restricted
    ) {
        return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(DAILY_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(DAILY_TASK, {
        minimumInterval: 60 * 60 * 6,
        stopOnTerminate: false,
        startOnBoot: true,
    });
}
