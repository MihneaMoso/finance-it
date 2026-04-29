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


let profile: UserLearningProfile = createDefaultProfile();

export function getProfile(): Readonly<UserLearningProfile> {
    return profile;
}

export function resetProfile(): void {
    profile = createDefaultProfile();
}


export function recordAnswer(event: AnswerEvent): void {
    const { conceptId, difficulty, correct, responseTimeMs } = event;

    
    profile.totalAnswered += 1;
    if (correct) {
        profile.correctAnswers += 1;
    }

    
    profile.difficultyBias[difficulty as Difficulty] += 1;

    
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

    
    const prevTotal = stats.averageResponseTimeMs * (stats.seenCount - 1);
    stats.averageResponseTimeMs =
        (prevTotal + responseTimeMs) / stats.seenCount;

    
}


export function getConceptStats(conceptId: ConceptID): Readonly<ConceptStats> {
    return profile.conceptStats[conceptId] ?? createDefaultConceptStats();
}

export function getSeenConcepts(): ConceptID[] {
    return Object.keys(profile.conceptStats);
}

export function isStruggledConcept(conceptId: ConceptID): boolean {
    const stats = profile.conceptStats[conceptId];
    if (!stats) return false;
    return stats.incorrectCount > stats.correctCount;
}

// ─── Feature Vector for ML ───────────────────────────────────────────────────


export function getFeatureVector(): FeatureVector {
    const totalBias =
        profile.difficultyBias.easy +
        profile.difficultyBias.medium +
        profile.difficultyBias.hard;

    const conceptIds = Object.keys(profile.conceptStats);
    const conceptCount = conceptIds.length;

    
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
        
        profile.totalAnswered > 0
            ? profile.correctAnswers / profile.totalAnswered
            : 0,
        
        Math.min(profile.totalAnswered / 100, 1),
        // Avg response time (normalized by 30s)
        Math.min(avgResponseTime / 30000, 1),
        
        conceptCount > 0 ? struggledConcepts / conceptCount : 0,
        
        totalBias > 0 ? profile.difficultyBias.easy / totalBias : 0.33,
        
        totalBias > 0 ? profile.difficultyBias.medium / totalBias : 0.33,
        
        totalBias > 0 ? profile.difficultyBias.hard / totalBias : 0.34,
       
        Math.min(conceptCount / 20, 1),
    ];
}


export function getUserSkillScore(): UserSkillScore {
    // Placeholder: simple heuristic based on accuracy and volume
    if (profile.totalAnswered === 0) return 0;

    const accuracy = profile.correctAnswers / profile.totalAnswered;
    const volumeBonus = Math.min(profile.totalAnswered / 50, 1) * 0.2;

    return Math.round((accuracy * 0.8 + volumeBonus) * 100);
}


export async function recordAnswerAndSync(
    event: AnswerEvent,
    clerkUserId?: string,
) {
    recordAnswer(event);

    if (!clerkUserId) return;

    // Streak counts any meaningful learning activity
    try {
        const res = await recordStreakActivity({
            userId: clerkUserId,
            type: event.questionType === "flashcard" ? "flashcards" : "answer",
        });

        if (res.newRecord) {
            void triggerAchievementNotification();
        }
    } catch {
        
    }

    try {
        
        await recordInteraction({ userId: clerkUserId, event });
    } catch {
        
    }

    try {
        
        await updateUserStats({
            clerkUserId,
            deltaTotalAnswered: 1,
            deltaCorrectAnswers: event.correct ? 1 : 0,
            responseTimeMs: event.responseTimeMs,
        });
    } catch {
        
    }
}
