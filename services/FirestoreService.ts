
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    where,
} from "firebase/firestore";

import { db } from "@/services/firebase";

export type Difficulty = "easy" | "medium" | "hard";

export type FirestoreQuestion = {
    id: string;
    type: "mcq" | "numeric";
    conceptId: string;
    difficulty: Difficulty;
    questionText: Record<string, string>;
    options?: Record<string, string[]>;
    correctIndex?: number;
    generatorConfig?: {
        type: "compound_interest" | "custom";
        params: Record<string, unknown>;
    };
};

export type FirestoreFlashcard = {
    id: string;
    conceptId: string;
    difficulty: Difficulty;
    front: Record<string, string>;
    back: Record<string, string>;
};

export type FirestoreLesson = {
    id: string;
    conceptIds: string[];
    difficulty: Difficulty;
    slides: Array<{
        title: Record<string, string>;
        content: Record<string, string>;
    }>;
    questionIds: string[];
};

export type FirestoreSimulation = {
    id: string;
    conceptIds: string[];
    steps: Array<{
        type: "story" | "question";
        content: Record<string, string>;
        questionId?: string;
    }>;
};

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type FirestoreUser = {
    clerkUserId: string;
    email: string;
    username: string;
    skillLevel: SkillLevel;
    stats: {
        totalAnswered: number;
        correctAnswers: number;
        avgResponseTime: number;
    };
    streak?: {
        current: number;
        longest: number;
        lastActiveDate: string; // YYYY-MM-DD
    };
};

// ─── In-memory caches ───────────────────────────────────────────────────────

const cache = {
    questions: new Map<string, FirestoreQuestion>(),
    flashcards: new Map<string, FirestoreFlashcard>(),
    lessons: new Map<string, FirestoreLesson>(),
    simulations: new Map<string, FirestoreSimulation>(),
    users: new Map<string, FirestoreUser>(),
};

// ─── Questions ──────────────────────────────────────────────────────────────

export async function fetchQuestions(params?: {
    conceptId?: string;
    difficulty?: Difficulty;
    take?: number;
}): Promise<FirestoreQuestion[]> {
    const take = params?.take ?? 200;
    const ref = collection(db, "questions");

    const filters = [] as any[];
    if (params?.conceptId)
        filters.push(where("conceptId", "==", params.conceptId));
    if (params?.difficulty)
        filters.push(where("difficulty", "==", params.difficulty));

    const qy = query(ref, ...filters, limit(take));
    const snap = await getDocs(qy);

    const out: FirestoreQuestion[] = [];
    snap.forEach((d) => {
        const data = d.data() as Omit<FirestoreQuestion, "id">;
        const item: FirestoreQuestion = { id: d.id, ...data };
        cache.questions.set(item.id, item);
        out.push(item);
    });

    return out;
}

export async function fetchQuestionById(
    id: string,
): Promise<FirestoreQuestion | null> {
    const cached = cache.questions.get(id);
    if (cached) return cached;

    const snap = await getDoc(doc(db, "questions", id));
    if (!snap.exists()) return null;
    const item: FirestoreQuestion = { id: snap.id, ...(snap.data() as any) };
    cache.questions.set(id, item);
    return item;
}

// ─── Flashcards ─────────────────────────────────────────────────────────────

export async function fetchFlashcards(params?: {
    conceptId?: string;
    take?: number;
}): Promise<FirestoreFlashcard[]> {
    const take = params?.take ?? 200;
    const ref = collection(db, "flashcards");

    const filters = [] as any[];
    if (params?.conceptId)
        filters.push(where("conceptId", "==", params.conceptId));

    const qy = query(ref, ...filters, limit(take));
    const snap = await getDocs(qy);

    const out: FirestoreFlashcard[] = [];
    snap.forEach((d) => {
        const data = d.data() as Omit<FirestoreFlashcard, "id">;
        const item: FirestoreFlashcard = { id: d.id, ...data };
        cache.flashcards.set(item.id, item);
        out.push(item);
    });

    return out;
}

// ─── Lessons ────────────────────────────────────────────────────────────────

export async function fetchLessons(params?: {
    take?: number;
}): Promise<FirestoreLesson[]> {
    const take = params?.take ?? 200;
    const ref = collection(db, "lessons");
    const qy = query(ref, limit(take));
    const snap = await getDocs(qy);

    const out: FirestoreLesson[] = [];
    snap.forEach((d) => {
        const data = d.data() as Omit<FirestoreLesson, "id">;
        const item: FirestoreLesson = { id: d.id, ...data };
        cache.lessons.set(item.id, item);
        out.push(item);
    });

    return out;
}

export async function fetchLessonById(
    id: string,
): Promise<FirestoreLesson | null> {
    const cached = cache.lessons.get(id);
    if (cached) return cached;

    const snap = await getDoc(doc(db, "lessons", id));
    if (!snap.exists()) return null;
    const item: FirestoreLesson = { id: snap.id, ...(snap.data() as any) };
    cache.lessons.set(id, item);
    return item;
}

// ─── Simulations ────────────────────────────────────────────────────────────

export async function fetchSimulationById(
    id: string,
): Promise<FirestoreSimulation | null> {
    const cached = cache.simulations.get(id);
    if (cached) return cached;

    const snap = await getDoc(doc(db, "simulations", id));
    if (!snap.exists()) return null;
    const item: FirestoreSimulation = { id: snap.id, ...(snap.data() as any) };
    cache.simulations.set(id, item);
    return item;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function fetchUserByClerkId(
    clerkUserId: string,
): Promise<FirestoreUser | null> {
    const cached = cache.users.get(clerkUserId);
    if (cached) return cached;

    const snap = await getDoc(doc(db, "users", clerkUserId));
    if (!snap.exists()) return null;
    const user = snap.data() as FirestoreUser;
    cache.users.set(clerkUserId, user);
    return user;
}

export async function upsertUser(user: FirestoreUser): Promise<void> {
    await setDoc(doc(db, "users", user.clerkUserId), user, { merge: true });
    cache.users.set(user.clerkUserId, user);
}
