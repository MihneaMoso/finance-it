import { Platform } from "react-native";

import i18n from "@/i18n/i18n";

const STORAGE = {
    askedPermission: "financeit/notifications/askedPermission",
    dailyTime: "financeit/notifications/dailyTime", // HH:MM
    activeUserId: "financeit/activeUserId",
};

type TimerKind = "reminder" | "warning";

const memoryStore = new Map<string, string>();
const webTimers = new Map<TimerKind, ReturnType<typeof setTimeout>>();

function isBrowser(): boolean {
    return typeof window !== "undefined";
}

function hasLocalStorage(): boolean {
    try {
        return (
            isBrowser() &&
            typeof window.localStorage !== "undefined" &&
            typeof window.localStorage.getItem === "function"
        );
    } catch {
        return false;
    }
}

function storageGet(key: string): string | null {
    if (hasLocalStorage()) {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
    if (hasLocalStorage()) {
        try {
            window.localStorage.setItem(key, value);
            return;
        } catch {
            // fall through
        }
    }
    memoryStore.set(key, value);
}

function storageRemove(key: string): void {
    if (hasLocalStorage()) {
        try {
            window.localStorage.removeItem(key);
            return;
        } catch {
            // fall through
        }
    }
    memoryStore.delete(key);
}

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

function supportsWebNotifications(): boolean {
    return (
        Platform.OS === "web" &&
        typeof globalThis !== "undefined" &&
        "Notification" in globalThis
    );
}

async function requestWebPermissionIfNeeded(): Promise<boolean> {
    if (!supportsWebNotifications()) return false;

    const NotificationCtor = (globalThis as any)
        .Notification as typeof Notification;
    if (!NotificationCtor) return false;

    if (NotificationCtor.permission === "granted") return true;
    if (NotificationCtor.permission === "denied") return false;

    if (!isBrowser()) return false;

    const result = await NotificationCtor.requestPermission();
    return result === "granted";
}

function scheduleWebAtNextOccurrence(params: {
    hour: number;
    minute: number;
    kind: TimerKind;
    body: string;
}) {
    if (!supportsWebNotifications()) return;

    const existing = webTimers.get(params.kind);
    if (existing) {
        clearTimeout(existing);
        webTimers.delete(params.kind);
    }

    const now = new Date();
    const next = new Date();
    next.setHours(params.hour, params.minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
    }

    const ms = next.getTime() - now.getTime();
    const timeout = setTimeout(() => {
        try {
            const NotificationCtor = (globalThis as any)
                .Notification as typeof Notification;
            new NotificationCtor(title(), { body: params.body });
        } catch {
            // ignore
        }

        // Reschedule daily
        scheduleWebAtNextOccurrence(params);
    }, ms);

    webTimers.set(params.kind, timeout);
}

export async function requestNotificationPermissions(): Promise<boolean> {
    // SSR-safe: never try to prompt on the server.
    if (!isBrowser()) return false;

    const asked = storageGet(STORAGE.askedPermission);
    storageSet(STORAGE.askedPermission, "1");

    if (asked) {
        return (globalThis as any).Notification?.permission === "granted";
    }

    return requestWebPermissionIfNeeded();
}

export async function setActiveUserIdForNotifications(userId: string | null) {
    if (!isBrowser()) return;

    if (!userId) {
        storageRemove(STORAGE.activeUserId);
        return;
    }

    storageSet(STORAGE.activeUserId, userId);
}

export async function setPreferredDailyTime(params: {
    hour: number;
    minute: number;
}) {
    if (!isBrowser()) return;

    const hour = Math.max(0, Math.min(23, params.hour));
    const minute = Math.max(0, Math.min(59, params.minute));

    storageSet(
        STORAGE.dailyTime,
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );

    await ensureDailyReminderScheduled(true);
}

export async function ensureDailyReminderScheduled(forceReschedule?: boolean) {
    if (!isBrowser()) return;

    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    // For web we just schedule a timer to fire while tab is open.
    // Rescheduling rotates the copy.
    const time = parseHHMM(storageGet(STORAGE.dailyTime));

    scheduleWebAtNextOccurrence({
        hour: time.hour,
        minute: time.minute,
        kind: "reminder",
        body: reminderBody(),
    });

    if (forceReschedule) {
        // Nothing else needed; timer already replaced.
    }
}

export async function scheduleStreakWarningAt(params: {
    hour: number;
    minute: number;
}) {
    if (!isBrowser()) return;

    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    scheduleWebAtNextOccurrence({
        hour: params.hour,
        minute: params.minute,
        kind: "warning",
        body: warningBody(),
    });
}

export async function triggerAchievementNotification() {
    if (!isBrowser()) return;

    const permitted = await requestNotificationPermissions();
    if (!permitted) return;

    if (!(await requestWebPermissionIfNeeded())) return;

    try {
        const NotificationCtor = (globalThis as any)
            .Notification as typeof Notification;
        new NotificationCtor(title(), { body: achievementBody() });
    } catch {
        // ignore
    }
}

export async function registerNotificationBackgroundTasks() {
    // Web: no background tasks.
    return;
}
