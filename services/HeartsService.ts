/**
 * HeartsService — daily hearts mechanic.
 *
 * Rules:
 * - 10 hearts per 24h window
 * - Wrong answers consume 1 heart
 * - At 0 hearts: lessons/simulations are blocked
 *
 * Persistence:
 * - Stored in AsyncStorage for now.
 * - TODO: Replace with backend storage per-user.
 *
 * Auth readiness:
 * - HeartsState includes `userId` (TODO: Clerk)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { HeartsState } from "@/types/questions";

const STORAGE_KEY = "financeit/hearts";

const MAX_HEARTS = 10;
const RESET_MS = 24 * 60 * 60 * 1000;

function defaultState(): HeartsState {
    return {
        // TODO: Replace with Clerk user ID
        userId: undefined,
        current: MAX_HEARTS,
        max: MAX_HEARTS,
        lastReset: Date.now(),
    };
}

function maybeReset(state: HeartsState): HeartsState {
    if (Date.now() - state.lastReset >= RESET_MS) {
        return {
            ...state,
            current: state.max,
            lastReset: Date.now(),
        };
    }

    return state;
}

export async function getHeartsState(): Promise<HeartsState> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: HeartsState = raw ? JSON.parse(raw) : defaultState();
    const next = maybeReset(parsed);

    if (next !== parsed) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    return next;
}

export async function setHeartsState(state: HeartsState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Use when user makes a mistake in lessons/simulations */
export async function consumeHeart(): Promise<HeartsState> {
    const state = maybeReset(await getHeartsState());

    const next: HeartsState = {
        ...state,
        current: Math.max(0, state.current - 1),
    };

    await setHeartsState(next);
    return next;
}

export async function canContinue(): Promise<boolean> {
    const state = await getHeartsState();
    return state.current > 0;
}

export async function refillHeartsForTesting(): Promise<HeartsState> {
    const state = await getHeartsState();
    const next: HeartsState = {
        ...state,
        current: state.max,
        lastReset: Date.now(),
    };
    await setHeartsState(next);
    return next;
}
