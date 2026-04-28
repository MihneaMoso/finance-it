import type {
    AnswerEvent,
    ConceptID,
    ConceptStats,
    Difficulty,
    FeatureVector,
    UserLearningProfile,
    UserSkillScore,
} from "@/types/questions";

import { recordInteraction } from "@/services/MLService";
import { triggerAchievementNotification } from "@/services/NotificationService";
import { recordStreakActivity } from "@/services/StreakService";
import { updateUserStats } from "@/services/UserService";

function createDefaultProfile(): UserLearningProfile {
    return {
        totalAnswered: 0,
        correctAnswers: 0,
        conceptStats: {},
        difficultyBias: {
            easy: 0,
            medium: 0,
            hard: 0,
        },
    };
}

function createDefaultConceptStats(): ConceptStats {
    return {
        seenCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        averageResponseTimeMs: 0,
        lastSeenTimestamp: 0,
    };
}

/**
 * In-memory learning profile.
 * TODO: Load from AsyncStorage on init, save after each update.
 */
let profile: UserLearningProfile = createDefaultProfile();

export function getProfile(): Readonly<UserLearningProfile> {
    return profile;
}

export function resetProfile(): void {
    profile = createDefaultProfile();
}

/**
 * Updates the learning profile after a user answers a question or flashcard.
 *
 * This is the single entry point for all learning data collection.
 * Both the home feed and flashcard screen call this function.
 */
export function recordAnswer(event: AnswerEvent): void {
    const { conceptId, difficulty, correct, responseTimeMs } = event;

    // Global stats
    profile.totalAnswered += 1;
    if (correct) {
        profile.correctAnswers += 1;
    }

    // Difficulty tracking
    profile.difficultyBias[difficulty as Difficulty] += 1;

    // Per-concept stats
    if (!profile.conceptStats[conceptId]) {
        profile.conceptStats[conceptId] = createDefaultConceptStats();
    }

    const stats = profile.conceptStats[conceptId];
    stats.seenCount += 1;
    stats.lastSeenTimestamp = Date.now();

    if (correct) {
        stats.correctCount += 1;
    } else {
        stats.incorrectCount += 1;
    }

    // Running average response time
    const prevTotal = stats.averageResponseTimeMs * (stats.seenCount - 1);
    stats.averageResponseTimeMs =
        (prevTotal + responseTimeMs) / stats.seenCount;

    // TODO: Persist updated profile to AsyncStorage
}

// ─── Concept Stats Access ────────────────────────────────────────────────────

/** Get stats for a specific concept, or default if unseen */
export function getConceptStats(conceptId: ConceptID): Readonly<ConceptStats> {
    return profile.conceptStats[conceptId] ?? createDefaultConceptStats();
}

/** Get all concept IDs the user has interacted with */
export function getSeenConcepts(): ConceptID[] {
    return Object.keys(profile.conceptStats);
}

/** Check if a concept has been answered incorrectly recently */
export function isStruggledConcept(conceptId: ConceptID): boolean {
    const stats = profile.conceptStats[conceptId];
    if (!stats) return false;
    return stats.incorrectCount > stats.correctCount;
}

// ─── Feature Vector for ML ───────────────────────────────────────────────────

/**
 * Returns a normalized feature vector for future ML model consumption.
 *
 * Current features (in order):
 * [0] Global accuracy ratio (0–1)
 * [1] Total questions answered (normalized by 100)
 * [2] Average response time across all concepts (normalized by 30000ms)
 * [3] Mistake density: ratio of concepts with more wrong than right answers
 * [4] Easy difficulty ratio
 * [5] Medium difficulty ratio
 * [6] Hard difficulty ratio
 * [7] Number of unique concepts seen (normalized by 20)
 *
 * TODO: Expand feature set as more signals are collected.
 * TODO: Add per-concept features when model supports variable-length input.
 */
export function getFeatureVector(): FeatureVector {
    const totalBias =
        profile.difficultyBias.easy +
        profile.difficultyBias.medium +
        profile.difficultyBias.hard;

    const conceptIds = Object.keys(profile.conceptStats);
    const conceptCount = conceptIds.length;

    // Calculate global avg response time
    let totalResponseTime = 0;
    let struggledConcepts = 0;

    for (const id of conceptIds) {
        const stats = profile.conceptStats[id];
        totalResponseTime += stats.averageResponseTimeMs;
        if (stats.incorrectCount > stats.correctCount) {
            struggledConcepts += 1;
        }
    }

    const avgResponseTime =
        conceptCount > 0 ? totalResponseTime / conceptCount : 0;

    return [
        // [0] Global accuracy
        profile.totalAnswered > 0
            ? profile.correctAnswers / profile.totalAnswered
            : 0,
        // [1] Total answered (normalized)
        Math.min(profile.totalAnswered / 100, 1),
        // [2] Avg response time (normalized by 30s)
        Math.min(avgResponseTime / 30000, 1),
        // [3] Mistake density
        conceptCount > 0 ? struggledConcepts / conceptCount : 0,
        // [4] Easy ratio
        totalBias > 0 ? profile.difficultyBias.easy / totalBias : 0.33,
        // [5] Medium ratio
        totalBias > 0 ? profile.difficultyBias.medium / totalBias : 0.33,
        // [6] Hard ratio
        totalBias > 0 ? profile.difficultyBias.hard / totalBias : 0.34,
        // [7] Concept breadth (normalized)
        Math.min(conceptCount / 20, 1),
    ];
}

// ─── User Ranking Service Stub ───────────────────────────────────────────────

/**
 * UserRankingService — Stub for future ML-based skill scoring.
 *
 * Architecture:
 * 1. Data collection → LearningProfileService (implemented)
 * 2. Decision logic → QuestionService.getNextQuestion (implemented)
 * 3. Ranking logic → UserRankingService (this stub)
 *
 * TODO: Implement with actual ML model inference.
 * TODO: Model input = getFeatureVector(), output = UserSkillScore (0–100).
 * TODO: Consider on-device inference (ONNX Runtime) vs server-side.
 */
export function getUserSkillScore(): UserSkillScore {
    // Placeholder: simple heuristic based on accuracy and volume
    if (profile.totalAnswered === 0) return 0;

    const accuracy = profile.correctAnswers / profile.totalAnswered;
    const volumeBonus = Math.min(profile.totalAnswered / 50, 1) * 0.2;

    return Math.round((accuracy * 0.8 + volumeBonus) * 100);
}

/**
 * recordAnswerAndSync — bridge to persist user stats to Firestore.
 *
 * Failsafe behavior:
 * - If Firestore fails, we keep local learning profile updated.
 *
 * TODO: implement offline sync queue.
 */
export async function recordAnswerAndSync(
    event: AnswerEvent,
    clerkUserId?: string,
) {
    recordAnswer(event);

    if (!clerkUserId) return;

    // Streak counts any meaningful learning activity.
    // Keep this best-effort and never block the learning flow.
    try {
        const res = await recordStreakActivity({
            userId: clerkUserId,
            type: event.questionType === "flashcard" ? "flashcards" : "answer",
        });

        if (res.newRecord) {
            void triggerAchievementNotification();
        }
    } catch {
        // ignore
    }

    try {
        // Preferred MVP path: send interaction to the Python ML service.
        // The service uses Firebase Admin SDK to write to Firestore (no client writes needed).
        await recordInteraction({ userId: clerkUserId, event });
    } catch {
        // ignore
    }

    try {
        // Legacy path (direct Firestore client write).
        // Note: current firestore.rules deny client writes unless you add a Firebase Auth bridge.
        await updateUserStats({
            clerkUserId,
            deltaTotalAnswered: 1,
            deltaCorrectAnswers: event.correct ? 1 : 0,
            responseTimeMs: event.responseTimeMs,
        });
    } catch {
        // ignore
    }
}
