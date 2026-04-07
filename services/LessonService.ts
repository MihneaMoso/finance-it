/**
 * LessonService — provides roadmap nodes and lesson content.
 *
 * Backend readiness:
 * TODO: Replace hardcoded data with API calls.
 * All models are JSON-serializable.
 */

import { FALLBACK_ENABLED } from "@/services/ContentFallback";
import { fetchLessonById } from "@/services/FirestoreService";
import type {
    Chapter,
    Lesson,
    LessonNode,
    LessonProgressState,
    LessonStatus,
    Question,
} from "@/types/questions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_KEY = "financeit/lessonProgress";

// ─── Chapters ───────────────────────────────────────────────────────────────

export const CHAPTERS: Chapter[] = [
    {
        id: "ch-1",
        title: { en: "Money basics", ro: "Baze financiare" },
        order: 1,
    },
    {
        id: "ch-2",
        title: { en: "Debt & interest", ro: "Datorii și dobândă" },
        order: 2,
    },
];

// ─── Roadmap Nodes ──────────────────────────────────────────────────────────

const ROADMAP_NODES: Omit<LessonNode, "status">[] = [
    {
        id: "lesson-1",
        type: "lesson",
        title: { en: "Inflation basics", ro: "Bazele inflației" },
        conceptIds: ["inflation"],
        difficulty: "easy",
        order: 1,
        chapterId: "ch-1",
        ui: { islandIndex: 0, x: 0.5, y: 0.05 },
    },
    {
        id: "sim-1",
        type: "simulation",
        title: {
            en: "Grocery budget shock",
            ro: "Șocul bugetului de cumpărături",
        },
        conceptIds: ["inflation", "budgeting"],
        difficulty: "easy",
        order: 2,
        chapterId: "ch-1",
        ui: { islandIndex: 1, x: 0.22, y: 0.18 },
    },
    {
        id: "ch1-test",
        type: "chapter_test",
        title: { en: "Chapter 1 test", ro: "Test capitol 1" },
        conceptIds: ["inflation", "budgeting"],
        difficulty: "easy",
        order: 3,
        chapterId: "ch-1",
        ui: { islandIndex: 2, x: 0.72, y: 0.32 },
    },
    {
        id: "lesson-2",
        type: "lesson",
        title: { en: "Compound interest", ro: "Dobânda compusă" },
        conceptIds: ["compound_interest"],
        difficulty: "medium",
        order: 4,
        chapterId: "ch-2",
        ui: { islandIndex: 3, x: 0.5, y: 0.48 },
    },
    {
        id: "sim-2",
        type: "simulation",
        title: {
            en: "Credit card payoff",
            ro: "Rambursarea cardului de credit",
        },
        conceptIds: ["interest_rates", "debt"],
        difficulty: "medium",
        order: 5,
        chapterId: "ch-2",
        ui: { islandIndex: 4, x: 0.25, y: 0.62 },
    },
    {
        id: "ch2-test",
        type: "chapter_test",
        title: { en: "Chapter 2 test", ro: "Test capitol 2" },
        conceptIds: ["interest_rates", "debt", "compound_interest"],
        difficulty: "medium",
        order: 6,
        chapterId: "ch-2",
        ui: { islandIndex: 5, x: 0.75, y: 0.76 },
    },
];

// ─── Lesson Content ─────────────────────────────────────────────────────────

const LESSONS: Record<string, Lesson> = {
    "lesson-1": {
        id: "lesson-1",
        title: { en: "Inflation basics", ro: "Bazele inflației" },
        slides: [
            {
                id: "s1",
                title: { en: "What is inflation?", ro: "Ce este inflația?" },
                content: {
                    en: "Inflation is the general rise in prices over time. When inflation is high, the same amount of money buys fewer goods.",
                    ro: "Inflația este creșterea generală a prețurilor în timp. Când inflația este mare, aceeași sumă de bani cumpără mai puține bunuri.",
                },
            },
            {
                id: "s2",
                title: { en: "Why it matters", ro: "De ce contează" },
                content: {
                    en: "If your savings earn 2% but inflation is 4%, your purchasing power decreases — even though the account balance grows.",
                    ro: "Dacă economiile tale cresc cu 2% dar inflația este 4%, puterea ta de cumpărare scade — chiar dacă soldul crește.",
                },
            },
        ],
        questions: [
            {
                id: "lesson1-mcq1",
                type: "mcq",
                question: "Inflation causes the purchasing power of money to:",
                options: [
                    "Increase",
                    "Decrease",
                    "Remain unchanged",
                    "Fluctuate randomly",
                ],
                correctIndex: 1,
                conceptId: "inflation",
                difficulty: "easy",
            },
            {
                id: "lesson1-mcq2",
                type: "mcq",
                question:
                    "If inflation is higher than your savings rate, your real wealth usually:",
                options: [
                    "Grows faster",
                    "Stays the same",
                    "Declines",
                    "Becomes unpredictable",
                ],
                correctIndex: 2,
                conceptId: "inflation",
                difficulty: "easy",
            },
        ] as Question[],
    },
    "lesson-2": {
        id: "lesson-2",
        title: { en: "Compound interest", ro: "Dobânda compusă" },
        slides: [
            {
                id: "s1",
                title: { en: "Compounding", ro: "Capitalizare" },
                content: {
                    en: "Compound interest means you earn interest on your original money and on previously earned interest.",
                    ro: "Dobânda compusă înseamnă că primești dobândă atât pe suma inițială, cât și pe dobânda acumulată anterior.",
                },
            },
            {
                id: "s2",
                title: { en: "Time is powerful", ro: "Timpul este puternic" },
                content: {
                    en: "Small differences in rate matter a lot over long periods. Starting earlier can beat investing more later.",
                    ro: "Diferențe mici de randament contează mult pe perioade lungi. A începe mai devreme poate bate investițiile mai mari făcute mai târziu.",
                },
            },
        ],
        questions: [
            {
                id: "lesson2-mcq1",
                type: "mcq",
                question:
                    "Compound interest differs from simple interest because it:",
                options: [
                    "Uses a lower rate",
                    "Is calculated only annually",
                    "Earns interest on accumulated interest",
                    "Applies only to savings accounts",
                ],
                correctIndex: 2,
                conceptId: "compound_interest",
                difficulty: "medium",
            },
        ] as Question[],
    },
};

// ─── Progress Persistence ───────────────────────────────────────────────────

function defaultProgress(): LessonProgressState {
    return {
        // TODO: Replace with Clerk user ID
        userId: undefined,
        completedNodeIds: [],
        lastUpdated: Date.now(),
    };
}

export async function getProgress(): Promise<LessonProgressState> {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : defaultProgress();
}

export async function setProgress(
    progress: LessonProgressState,
): Promise<void> {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function completeNode(nodeId: string): Promise<void> {
    const progress = await getProgress();
    if (!progress.completedNodeIds.includes(nodeId)) {
        progress.completedNodeIds.push(nodeId);
        progress.lastUpdated = Date.now();
        await setProgress(progress);
    }
}

// ─── Roadmap API ────────────────────────────────────────────────────────────

export async function getRoadmapNodes(): Promise<LessonNode[]> {
    const progress = await getProgress();

    const completed = new Set(progress.completedNodeIds);
    const sorted = [...ROADMAP_NODES].sort((a, b) => a.order - b.order);

    return sorted.map((node, idx): LessonNode => {
        let status: LessonStatus = "locked";

        if (completed.has(node.id)) {
            status = "completed";
        } else if (idx === 0) {
            status = "available";
        } else {
            const prev = sorted[idx - 1];
            if (completed.has(prev.id)) {
                status = "available";
            }
        }

        return { ...node, status };
    });
}

export async function getLessonById(id: string): Promise<Lesson | null> {
    // TODO: Replace with API call (backend)
    try {
        const remote = await fetchLessonById(id);
        if (remote) {
            // Map FirestoreLesson -> Lesson
            return {
                id: remote.id,
                title: { en: remote.id, ro: remote.id }, // TODO: add lesson titles to Firestore schema
                slides: remote.slides.map((s, idx) => ({
                    id: `slide-${idx}`,
                    title: s.title,
                    content: s.content,
                })),
                questions: [], // TODO: resolve questionIds -> Question[] via Firestore
            };
        }
    } catch {
        // ignore and fallback
    }

    return FALLBACK_ENABLED ? (LESSONS[id] ?? null) : null;
}
