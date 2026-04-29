

import type { FirestoreUser, SkillLevel } from "@/services/FirestoreService";
import { fetchUserByClerkId, upsertUser } from "@/services/FirestoreService";

export function computeSkillLevel(stats: {
    totalAnswered: number;
    correctAnswers: number;
    avgResponseTime: number;
}): SkillLevel {
    const total = stats.totalAnswered;
    const accuracy = total > 0 ? stats.correctAnswers / total : 0;

    if (accuracy < 0.5) return "beginner";
    if (accuracy <= 0.8) return "intermediate";

    
    if (stats.avgResponseTime > 0 && stats.avgResponseTime < 7000) {
        return "advanced";
    }
    return "intermediate";
}

export async function ensureUserDoc(params: {
    clerkUserId: string;
    email: string;
    username: string;
}): Promise<FirestoreUser> {
    const existing = await fetchUserByClerkId(params.clerkUserId);
    if (existing) return existing;

    const newUser: FirestoreUser = {
        clerkUserId: params.clerkUserId,
        email: params.email,
        username: params.username,
        skillLevel: "beginner",
        stats: {
            totalAnswered: 0,
            correctAnswers: 0,
            avgResponseTime: 0,
        },
    };

    await upsertUser(newUser);
    return newUser;
}

export async function updateUserStats(params: {
    clerkUserId: string;
    deltaTotalAnswered: number;
    deltaCorrectAnswers: number;
    responseTimeMs: number;
}): Promise<void> {
    const user = await ensureUserDoc({
        clerkUserId: params.clerkUserId,
        email: "",
        username: "",
    });

    const nextTotal = Math.max(
        0,
        user.stats.totalAnswered + params.deltaTotalAnswered,
    );
    const nextCorrect = Math.max(
        0,
        user.stats.correctAnswers + params.deltaCorrectAnswers,
    );

    
    const prevAvg = user.stats.avgResponseTime;
    const prevN = user.stats.totalAnswered;
    const nextAvg =
        nextTotal > 0
            ? (prevAvg * prevN + params.responseTimeMs) / (prevN + 1)
            : params.responseTimeMs;

    const nextStats = {
        totalAnswered: nextTotal,
        correctAnswers: nextCorrect,
        avgResponseTime: nextAvg,
    };

    const skillLevel = computeSkillLevel(nextStats);

    await upsertUser({
        ...user,
        stats: nextStats,
        skillLevel,
    });
}
