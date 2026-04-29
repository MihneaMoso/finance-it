
import { FALLBACK_ENABLED } from "@/services/ContentFallback";
import { fetchSimulationById } from "@/services/FirestoreService";
import type { Simulation } from "@/types/questions";

const SIMULATIONS: Record<string, Simulation> = {
    "sim-1": {
        id: "sim-1",
        title: {
            en: "Grocery budget shock",
            ro: "Șocul bugetului de cumpărături",
        },
        conceptIds: ["inflation", "budgeting"],
        steps: [
            {
                id: "st-1",
                type: "story",
                content: {
                    en: "Your weekly groceries used to cost $80. This month they're $92 for the same items.",
                    ro: "Cumpărăturile săptămânale costau $80. Luna aceasta sunt $92 pentru aceleași produse.",
                },
                nextStepId: "st-2",
            },
            {
                id: "st-2",
                type: "question",
                content: {
                    en: "What is the most likely explanation?",
                    ro: "Care este explicația cea mai probabilă?",
                },
                question: {
                    id: "sim1-q1",
                    type: "mcq",
                    question: "Your groceries cost more primarily because:",
                    options: [
                        "You bought different items",
                        "Inflation increased prices",
                        "Taxes disappeared",
                        "Interest rates fell",
                    ],
                    correctIndex: 1,
                    conceptId: "inflation",
                    difficulty: "easy",
                },
                nextStepId: "st-3",
            },
            {
                id: "st-3",
                type: "story",
                content: {
                    en: "If your income doesn’t change, you may need to reduce spending elsewhere or adjust the budget. This is one way inflation affects daily life.",
                    ro: "Dacă venitul nu se schimbă, poate trebuie să reduci cheltuieli sau să ajustezi bugetul. Așa afectează inflația viața de zi cu zi.",
                },
            },
        ],
    },
    "sim-2": {
        id: "sim-2",
        title: {
            en: "Credit card payoff",
            ro: "Rambursarea cardului de credit",
        },
        conceptIds: ["interest_rates", "debt"],
        steps: [
            {
                id: "st-1",
                type: "story",
                content: {
                    en: "You owe $1,200 on a credit card with 24% APR. You can pay $200 this month.",
                    ro: "Datorezi $1.200 pe un card de credit cu 24% APR. Poți plăti $200 luna aceasta.",
                },
                nextStepId: "st-2",
            },
            {
                id: "st-2",
                type: "question",
                content: {
                    en: "Which choice usually reduces total interest paid the most?",
                    ro: "Ce alegere reduce de obicei cel mai mult dobânda totală plătită?",
                },
                question: {
                    id: "sim2-q1",
                    type: "mcq",
                    question: "To minimize interest, you should generally:",
                    options: [
                        "Pay the minimum",
                        "Pay as much as you can early",
                        "Skip payment for one month",
                        "Only pay when rates fall",
                    ],
                    correctIndex: 1,
                    conceptId: "debt",
                    difficulty: "medium",
                },
                nextStepId: "st-3",
            },
            {
                id: "st-3",
                type: "story",
                content: {
                    en: "Paying more earlier leaves a smaller balance for future interest calculations. High APR debt compounds quickly.",
                    ro: "Plata mai mare mai devreme lasă un sold mai mic pe care se calculează dobânda. Datoria cu APR mare se capitalizează rapid.",
                },
            },
        ],
    },
};

export async function getSimulationById(
    id: string,
): Promise<Simulation | null> {
    // TODO: Replace hardcoded data with API calls.
    try {
        const remote = await fetchSimulationById(id);
        if (remote) {
            return {
                id: remote.id,
                title: { en: remote.id, ro: remote.id },
                conceptIds: remote.conceptIds,
                steps: remote.steps.map((s, idx) => ({
                    id: `step-${idx}`,
                    type: s.type,
                    content: s.content,
                    
                })),
            };
        }
    } catch {
        // fallback
    }

    return FALLBACK_ENABLED ? (SIMULATIONS[id] ?? null) : null;
}

export async function getSimulationQuestionCount(id: string): Promise<number> {
    const sim = await getSimulationById(id);
    if (!sim) return 0;

    return sim.steps.filter((s) => s.type === "question" && s.question).length;
}
