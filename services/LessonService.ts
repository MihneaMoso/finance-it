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

const LEGACY_PROGRESS_KEY = "financeit/lessonProgress";
const PROGRESS_KEY_PREFIX = "financeit/lessonProgress:";

function normalizeUserScope(userId?: string | null): string {
    const trimmed = (userId ?? "").trim();
    return trimmed ? trimmed : "guest";
}

function progressKey(userId?: string | null): string {
    return `${PROGRESS_KEY_PREFIX}${normalizeUserScope(userId)}`;
}

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

function defaultProgress(): LessonProgressState {
    return {
        userId: undefined,
        completedNodeIds: [],
        lastUpdated: Date.now(),
    };
}

export async function getProgress(
    userId?: string | null,
): Promise<LessonProgressState> {
    const key = progressKey(userId);
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
        const parsed = JSON.parse(raw) as LessonProgressState;
        return {
            ...defaultProgress(),
            ...parsed,
            userId: normalizeUserScope(userId),
        };
    }

    // Legacy migration: older versions stored a single shared progress blob.
    const legacyRaw = await AsyncStorage.getItem(LEGACY_PROGRESS_KEY);
    if (legacyRaw) {
        try {
            const legacy = JSON.parse(legacyRaw) as LessonProgressState;
            const migrated: LessonProgressState = {
                ...defaultProgress(),
                ...legacy,
                userId: normalizeUserScope(userId),
                lastUpdated: Date.now(),
            };
            await AsyncStorage.setItem(key, JSON.stringify(migrated));
            await AsyncStorage.removeItem(LEGACY_PROGRESS_KEY);
            return migrated;
        } catch {
            // Ignore corrupt legacy value.
        }
    }

    return {
        ...defaultProgress(),
        userId: normalizeUserScope(userId),
    };
}

export async function setProgress(
    progress: LessonProgressState,
    userId?: string | null,
): Promise<void> {
    const key = progressKey(userId ?? progress.userId);
    await AsyncStorage.setItem(key, JSON.stringify(progress));
}

export async function completeNode(
    nodeId: string,
    userId?: string | null,
): Promise<void> {
    const progress = await getProgress(userId);
    if (!progress.completedNodeIds.includes(nodeId)) {
        progress.completedNodeIds.push(nodeId);
        progress.lastUpdated = Date.now();
        progress.userId = normalizeUserScope(userId);
        await setProgress(progress, userId);
    }
}

export async function resetProgressForUser(
    userId?: string | null,
): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(progressKey(userId)),
        AsyncStorage.removeItem(LEGACY_PROGRESS_KEY),
    ]);
}

export async function getRoadmapNodes(
    userId?: string | null,
): Promise<LessonNode[]> {
    const progress = await getProgress(userId);

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
                title: { en: remote.id, ro: remote.id },
                slides: remote.slides.map((s, idx) => ({
                    id: `slide-${idx}`,
                    title: s.title,
                    content: s.content,
                })),
                questions: [],
            };
        }
    } catch {
        // fallback
    }

    return FALLBACK_ENABLED ? (LESSONS[id] ?? null) : null;
}
