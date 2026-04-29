import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Streak } from "@/services/MLService";
import { fetchStreak, upsertStreak } from "@/services/MLService";

export type StreakActivityType = "answer" | "lesson" | "flashcards";

type Listener = (next: Streak) => void;

const STORAGE_PREFIX = "financeit/streak";

const listeners = new Set<Listener>();

export function subscribeToStreak(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function emit(next: Streak) {
    for (const l of listeners) l(next);
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

export function formatLocalYYYYMMDD(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseLocalYYYYMMDD(s: string): Date | null {
    
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
        return null;
    }
    return new Date(y, mo - 1, da, 12, 0, 0, 0);
}

function diffDaysLocal(aYYYYMMDD: string, bYYYYMMDD: string): number | null {
    const a = parseLocalYYYYMMDD(aYYYYMMDD);
    const b = parseLocalYYYYMMDD(bYYYYMMDD);
    if (!a || !b) return null;
    const ms = a.getTime() - b.getTime();
    return Math.round(ms / 86400000);
}

function defaultStreak(today: string): Streak {
    return { current: 0, longest: 0, lastActiveDate: today };
}

function storageKey(userId: string): string {
    return `${STORAGE_PREFIX}/${userId}`;
}

export async function getStreak(userId: string): Promise<Streak> {
    const today = formatLocalYYYYMMDD(new Date());

    
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Streak;
            if (
                typeof parsed?.current === "number" &&
                typeof parsed?.longest === "number" &&
                typeof parsed?.lastActiveDate === "string"
            ) {
                return parsed;
            }
        } catch {
            
        }
    }

    
    try {
        const remote = await fetchStreak({ userId });
        if (remote) {
            await AsyncStorage.setItem(
                storageKey(userId),
                JSON.stringify(remote),
            );
            return remote;
        }
    } catch {
        
    }

    return defaultStreak(today);
}

export function computeNextStreak(params: { prev: Streak; today: string }): {
    next: Streak;
    changed: boolean;
    increased: boolean;
    newRecord: boolean;
} {
    const { prev, today } = params;

    
    if (prev.lastActiveDate === today) {
        return {
            next: prev,
            changed: false,
            increased: false,
            newRecord: false,
        };
    }

    const dayDiff = diffDaysLocal(today, prev.lastActiveDate);

    let nextCurrent = 1;
    if (dayDiff === 1) {
        nextCurrent = Math.max(0, prev.current) + 1;
    } else {
        nextCurrent = 1;
    }

    const nextLongest = Math.max(prev.longest ?? 0, nextCurrent);

    const next: Streak = {
        current: nextCurrent,
        longest: nextLongest,
        lastActiveDate: today,
    };

    return {
        next,
        changed: true,
        increased: nextCurrent > (prev.current ?? 0),
        newRecord: nextCurrent > (prev.longest ?? 0),
    };
}

export async function recordStreakActivity(params: {
    userId: string;
    type: StreakActivityType;
    now?: Date;
}): Promise<{ next: Streak; increased: boolean; newRecord: boolean }> {
    const now = params.now ?? new Date();
    const today = formatLocalYYYYMMDD(now);

    const prev = await getStreak(params.userId);
    const { next, changed, increased, newRecord } = computeNextStreak({
        prev,
        today,
    });

    if (!changed) {
        return { next, increased: false, newRecord: false };
    }

    await AsyncStorage.setItem(storageKey(params.userId), JSON.stringify(next));
    emit(next);

    
    try {
        await upsertStreak({ userId: params.userId, streak: next });
    } catch {
        
    }

    return { next, increased, newRecord };
}
