import type { AnswerEvent, ConceptID } from "@/types/questions";

export type RecommendConceptsResponse = {
    rankedConcepts: ConceptID[];
    pCorrectByConcept?: Record<ConceptID, number>;
};

function getBaseUrl(): string | null {
    const raw = process.env.EXPO_PUBLIC_ML_SERVICE_URL;
    if (!raw) return null;
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function postJson<T>(
    path: string,
    body: unknown,
    timeoutMs: number,
): Promise<T> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
        throw new Error("Missing EXPO_PUBLIC_ML_SERVICE_URL");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`ML service error (${res.status}): ${text}`);
        }

        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

export async function recommendConcepts(params: {
    userId: string;
    conceptIds: ConceptID[];
    timeoutMs?: number;
}): Promise<RecommendConceptsResponse> {
    return postJson<RecommendConceptsResponse>(
        "/recommend",
        {
            userId: params.userId,
            conceptIds: params.conceptIds,
        },
        params.timeoutMs ?? 180,
    );
}

export async function recordInteraction(params: {
    userId: string;
    event: AnswerEvent;
    timeoutMs?: number;
}): Promise<void> {
    const timestamp = params.event.timestamp ?? Date.now();

    // The ML service schema expects `questionId` to be present.
    // Ensure call sites always provide it.
    const questionId = params.event.questionId;
    if (!questionId) {
        throw new Error("recordInteraction requires event.questionId");
    }

    await postJson<{ ok: boolean }>(
        "/interactions/record",
        {
            userId: params.userId,
            questionId,
            conceptId: params.event.conceptId,
            difficulty: params.event.difficulty,
            correct: params.event.correct,
            responseTime: params.event.responseTimeMs,
            timestamp,
        },
        params.timeoutMs ?? 180,
    );
}
