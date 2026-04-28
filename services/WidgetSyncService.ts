import { Platform } from "react-native";

import i18n from "@/i18n/i18n";
import { getFlashcardPool } from "@/services/FlashcardService";
import { recordAnswerAndSync } from "@/services/LearningProfileService";
import { getRoadmapNodes } from "@/services/LessonService";
import { getStreak } from "@/services/StreakService";
import {
    getAndClearPendingFlashcardActions,
    setFlashcardsJson,
    setNextLesson,
    setStreakCurrent,
} from "@/services/WidgetBridge";

function isAndroid(): boolean {
    return Platform.OS === "android";
}

function pickLocalizedText(text: { en: string; ro?: string } | string): string {
    if (typeof text === "string") return text;
    const lang = (i18n.language || "en").toLowerCase();
    if (lang.startsWith("ro")) return text.ro ?? text.en;
    return text.en;
}

export async function syncStreakWidget(userId: string): Promise<void> {
    if (!isAndroid()) return;
    const streak = await getStreak(userId);
    await setStreakCurrent(streak.current);
}

export async function syncNextLessonWidget(): Promise<void> {
    if (!isAndroid()) return;

    const nodes = await getRoadmapNodes();
    const next =
        nodes.find((n) => n.status === "available" && n.type === "lesson") ??
        null;

    if (!next) {
        await setNextLesson({ lessonId: null, title: null });
        return;
    }

    await setNextLesson({
        lessonId: next.id,
        title: pickLocalizedText(next.title as any),
    });
}

export async function syncFlashcardsWidget(): Promise<void> {
    if (!isAndroid()) return;

    const pool = getFlashcardPool();
    const cards = pool.map((c) => ({
        id: c.id,
        conceptId: c.conceptId,
        difficulty: c.difficulty,
        front: pickLocalizedText(c.front as any),
        back: pickLocalizedText(c.back as any),
    }));

    await setFlashcardsJson(JSON.stringify(cards));
}

export async function flushPendingFlashcardWidgetActions(params: {
    userId: string;
}): Promise<void> {
    if (!isAndroid()) return;

    const raw = await getAndClearPendingFlashcardActions();
    if (!raw) return;

    let parsed: Array<any> = [];
    try {
        parsed = JSON.parse(raw) as Array<any>;
        if (!Array.isArray(parsed)) parsed = [];
    } catch {
        parsed = [];
    }

    for (const e of parsed) {
        const cardId = typeof e?.cardId === "string" ? e.cardId : "";
        const conceptId = typeof e?.conceptId === "string" ? e.conceptId : "";
        const difficulty =
            e?.difficulty === "easy" ||
            e?.difficulty === "medium" ||
            e?.difficulty === "hard"
                ? e.difficulty
                : "easy";
        const knew = !!e?.knew;

        if (!cardId || !conceptId) continue;

        await recordAnswerAndSync(
            {
                questionId: cardId,
                conceptId,
                difficulty,
                correct: knew,
                responseTimeMs: 1500,
                questionType: "flashcard",
            },
            params.userId,
        );
    }
}

export async function syncAllWidgetsForUser(userId: string): Promise<void> {
    if (!isAndroid()) return;

    await flushPendingFlashcardWidgetActions({ userId });

    await Promise.all([
        syncStreakWidget(userId),
        syncNextLessonWidget(),
        syncFlashcardsWidget(),
    ]);
}
