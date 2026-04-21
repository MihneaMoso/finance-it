/**
 * QuestionService — local mock backend for the Finance-IT app.
 *
 * Responsibilities:
 * - Serve questions to the home feed
 * - Bias question selection based on the user's learning profile (mistake-driven)
 * - Generate numeric questions with randomized parameters
 * - Prevent immediate repeats
 *
 * Mistake-Driven Algorithm:
 * - Concepts with high error rates are weighted higher
 * - Concepts not seen recently get a recency boost
 * - Difficulty increases after 3+ consecutive correct answers on same concept
 * - Mistaken concepts are reintroduced within 5–10 questions
 *
 * Future extension point: Replace this with a real API client
 * that fetches questions from a backend service.
 */

import type {
    ConceptID,
    Difficulty,
    GeneratedQuestionTemplate,
    MCQQuestion,
    ResolvedQuestion,
    UserLearningProfile,
} from "@/types/questions";

import { getProfile } from "@/services/LearningProfileService";
import { recommendConcepts } from "@/services/MLService";

// ─── ML Recommender (server-side) ───────────────────────────────────────────

type MlCache = {
    userId: string;
    fetchedAt: number;
    rankedConcepts: ConceptID[];
    pCorrectByConcept?: Record<ConceptID, number>;
};

let activeUserId: string | null = null;
let mlCache: MlCache | null = null;
let mlInFlight: Promise<void> | null = null;

const ML_CACHE_TTL_MS = 30_000;

export function setActiveUserIdForRecommendations(userId: string | null): void {
    activeUserId = userId;
    if (!activeUserId || mlCache?.userId !== activeUserId) {
        mlCache = null;
    }
}

function getMlWeaknessByConcept(
    conceptIds: ConceptID[],
): Record<ConceptID, number> | null {
    if (!mlCache) return null;
    if (mlCache.userId !== activeUserId) return null;
    if (Date.now() - mlCache.fetchedAt > ML_CACHE_TTL_MS) return null;

    const weakness: Record<ConceptID, number> = {};

    // Preferred: use calibrated probabilities if provided
    if (mlCache.pCorrectByConcept) {
        for (const cid of conceptIds) {
            const p = mlCache.pCorrectByConcept[cid];
            if (typeof p === "number")
                weakness[cid] = Math.max(0, Math.min(1, 1 - p));
        }
    }

    // Fallback: derive a 0..1 weakness score from rank position
    if (Object.keys(weakness).length === 0) {
        const ranked = mlCache.rankedConcepts;
        const n = ranked.length;
        for (let i = 0; i < n; i++) {
            const cid = ranked[i];
            // rankedConcepts: weakest -> strongest
            weakness[cid] = n <= 1 ? 1 : 1 - i / (n - 1);
        }
    }

    return weakness;
}

function maybeRefreshMlCache(conceptIds: ConceptID[]): void {
    if (!activeUserId) return;
    if (mlInFlight) return;
    if (
        mlCache &&
        mlCache.userId === activeUserId &&
        Date.now() - mlCache.fetchedAt <= ML_CACHE_TTL_MS
    ) {
        return;
    }

    mlInFlight = (async () => {
        try {
            const resp = await recommendConcepts({
                userId: activeUserId,
                conceptIds,
                timeoutMs: 180,
            });

            mlCache = {
                userId: activeUserId,
                fetchedAt: Date.now(),
                rankedConcepts: resp.rankedConcepts,
                pCorrectByConcept: resp.pCorrectByConcept,
            };
        } catch {
            // ignore
        } finally {
            mlInFlight = null;
        }
    })();
}

// ─── Static MCQ Question Pool ────────────────────────────────────────────────

const MCQ_POOL: MCQQuestion[] = [
    {
        id: "mcq-1",
        type: "mcq",
        question:
            "If interest rates rise, what typically happens to bond prices?",
        options: [
            "They increase",
            "They decrease",
            "They stay the same",
            "They become volatile",
        ],
        correctIndex: 1,
        conceptId: "interest_rates",
        difficulty: "medium",
    },
    {
        id: "mcq-2",
        type: "mcq",
        question: 'What does "diversification" primarily help reduce?',
        options: [
            "Tax liability",
            "Unsystematic risk",
            "Inflation",
            "Transaction costs",
        ],
        correctIndex: 1,
        conceptId: "risk_diversification",
        difficulty: "easy",
    },
    {
        id: "mcq-3",
        type: "mcq",
        question:
            "Which financial statement shows a company's revenues and expenses?",
        options: [
            "Balance Sheet",
            "Cash Flow Statement",
            "Income Statement",
            "Statement of Equity",
        ],
        correctIndex: 2,
        conceptId: "financial_statements",
        difficulty: "easy",
    },
    {
        id: "mcq-4",
        type: "mcq",
        question: 'What is the "Rule of 72" used to estimate?',
        options: [
            "Time to double an investment",
            "Maximum portfolio loss",
            "Optimal asset allocation",
            "Tax deductions",
        ],
        correctIndex: 0,
        conceptId: "rule_of_72",
        difficulty: "easy",
    },
    {
        id: "mcq-5",
        type: "mcq",
        question: "A P/E ratio compares a stock's price to its:",
        options: ["Revenue", "Earnings per share", "Dividends", "Book value"],
        correctIndex: 1,
        conceptId: "stock_valuation",
        difficulty: "medium",
    },
    {
        id: "mcq-6",
        type: "mcq",
        question:
            "Which type of fund typically has the lowest management fees?",
        options: [
            "Hedge fund",
            "Mutual fund",
            "Index fund",
            "Private equity fund",
        ],
        correctIndex: 2,
        conceptId: "investment_funds",
        difficulty: "easy",
    },
    {
        id: "mcq-7",
        type: "mcq",
        question: "What does GDP stand for?",
        options: [
            "Gross Domestic Product",
            "General Domestic Pricing",
            "Growth Demand Percentage",
            "Gross Demand Profit",
        ],
        correctIndex: 0,
        conceptId: "macroeconomics",
        difficulty: "easy",
    },
    {
        id: "mcq-8",
        type: "mcq",
        question: 'What is a "bear market"?',
        options: [
            "A market rising by 20% or more",
            "A market declining by 20% or more",
            "A market with high volatility",
            "A market with low trading volume",
        ],
        correctIndex: 1,
        conceptId: "market_cycles",
        difficulty: "easy",
    },
    {
        id: "mcq-9",
        type: "mcq",
        question: "Which asset is generally considered the safest?",
        options: [
            "Corporate bonds",
            "Stocks",
            "U.S. Treasury bills",
            "Cryptocurrency",
        ],
        correctIndex: 2,
        conceptId: "risk_diversification",
        difficulty: "easy",
    },
    {
        id: "mcq-10",
        type: "mcq",
        question: "Compound interest differs from simple interest because it:",
        options: [
            "Uses a lower rate",
            "Is calculated only annually",
            "Earns interest on accumulated interest",
            "Applies only to savings accounts",
        ],
        correctIndex: 2,
        conceptId: "compound_interest",
        difficulty: "easy",
    },
    {
        id: "mcq-11",
        type: "mcq",
        question: "What does an ETF stand for?",
        options: [
            "Electronic Transfer Fund",
            "Exchange-Traded Fund",
            "Equity Trust Fund",
            "Estimated Tax Filing",
        ],
        correctIndex: 1,
        conceptId: "investment_funds",
        difficulty: "easy",
    },
    {
        id: "mcq-12",
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
];

// ─── Numeric Question Templates ──────────────────────────────────────────────

/** Helper to get a random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Helper to round to 2 decimal places */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

const NUMERIC_TEMPLATES: GeneratedQuestionTemplate[] = [
    {
        id: "num-compound-interest",
        type: "numeric",
        template: "Compound interest calculation",
        conceptId: "compound_interest",
        difficulty: "medium",
        generator: () => {
            const principal = randInt(1, 50) * 1000;
            const rate = randInt(2, 12);
            const years = randInt(1, 10);
            const answer = round2(principal * Math.pow(1 + rate / 100, years));
            return {
                questionText: `You invest $${principal.toLocaleString()} at ${rate}% annual compound interest. How much will you have after ${years} year${years > 1 ? "s" : ""}?`,
                correctAnswer: answer,
                tolerance: answer * 0.01,
            };
        },
    },
    {
        id: "num-simple-interest",
        type: "numeric",
        template: "Simple interest calculation",
        conceptId: "simple_interest",
        difficulty: "easy",
        generator: () => {
            const principal = randInt(1, 20) * 1000;
            const rate = randInt(3, 10);
            const years = randInt(1, 5);
            const interest = round2(principal * (rate / 100) * years);
            const total = principal + interest;
            return {
                questionText: `You deposit $${principal.toLocaleString()} in an account earning ${rate}% simple interest per year. What is the total amount after ${years} year${years > 1 ? "s" : ""}?`,
                correctAnswer: total,
                tolerance: total * 0.01,
            };
        },
    },
    {
        id: "num-rule-of-72",
        type: "numeric",
        template: "Rule of 72 estimation",
        conceptId: "rule_of_72",
        difficulty: "easy",
        generator: () => {
            const rate = randInt(2, 12);
            const answer = round2(72 / rate);
            return {
                questionText: `Using the Rule of 72, approximately how many years will it take to double your money at a ${rate}% annual return? (Round to the nearest whole number)`,
                correctAnswer: Math.round(answer),
                tolerance: 1,
            };
        },
    },
    {
        id: "num-future-value-annuity",
        type: "numeric",
        template: "Future value of monthly savings",
        conceptId: "future_value",
        difficulty: "hard",
        generator: () => {
            const monthly = randInt(1, 10) * 100;
            const rate = randInt(4, 10);
            const years = randInt(2, 10);
            const r = rate / 100 / 12;
            const n = years * 12;
            const fv = round2(monthly * ((Math.pow(1 + r, n) - 1) / r));
            return {
                questionText: `You save $${monthly} per month for ${years} years at ${rate}% annual interest (compounded monthly). What is the total future value?`,
                correctAnswer: fv,
                tolerance: fv * 0.01,
            };
        },
    },
];

// ─── All Questions Pool (for scoring) ────────────────────────────────────────

type ScoredQuestion = {
    resolve: () => ResolvedQuestion;
    conceptId: ConceptID;
    difficulty: Difficulty;
};

/** Build a combined pool of all available questions for scoring */
function getAllQuestions(): ScoredQuestion[] {
    const pool: ScoredQuestion[] = [];

    for (const mcq of MCQ_POOL) {
        pool.push({
            resolve: () => ({ ...mcq }),
            conceptId: mcq.conceptId,
            difficulty: mcq.difficulty,
        });
    }

    for (const template of NUMERIC_TEMPLATES) {
        pool.push({
            resolve: () => {
                const generated = template.generator();
                return {
                    id: `${template.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    type: "numeric" as const,
                    questionText: generated.questionText,
                    correctAnswer: generated.correctAnswer,
                    tolerance:
                        generated.tolerance ?? generated.correctAnswer * 0.01,
                    conceptId: template.conceptId,
                    difficulty: template.difficulty,
                };
            },
            conceptId: template.conceptId,
            difficulty: template.difficulty,
        });
    }

    return pool;
}

// ─── Mistake-Driven Scoring ──────────────────────────────────────────────────

/** Weight constants for the scoring function */
const WEIGHTS = {
    MISTAKE: 3.0,
    RECENCY: 1.5,
    DIFFICULTY_ADJUSTMENT: 1.0,
    UNSEEN: 2.0,
    BASE_RANDOM: 0.5,
};

/**
 * Scores a question based on the user's learning profile.
 *
 * score = mistakeWeight + recencyWeight + difficultyAdjustment + randomness
 *
 * Higher scores = more likely to be selected.
 */
function scoreQuestion(
    question: ScoredQuestion,
    profile: Readonly<UserLearningProfile>,
): number {
    const { conceptId, difficulty } = question;
    const stats = profile.conceptStats[conceptId];

    let score = 0;

    if (!stats) {
        // Never seen this concept — give it a boost to ensure coverage
        score += WEIGHTS.UNSEEN;
    } else {
        // Mistake weight: higher for concepts with more errors
        if (stats.seenCount > 0) {
            const errorRate = stats.incorrectCount / stats.seenCount;
            score += errorRate * WEIGHTS.MISTAKE;
        }

        // Recency weight: boost concepts not seen recently
        const timeSinceLastSeen = Date.now() - stats.lastSeenTimestamp;
        const minutesSinceLastSeen = timeSinceLastSeen / 60000;
        score += Math.min(minutesSinceLastSeen / 10, 1) * WEIGHTS.RECENCY;

        // Difficulty adjustment: increase difficulty after 3+ correct in a row
        if (stats.correctCount >= 3 && stats.incorrectCount === 0) {
            // User has mastered this concept at current difficulty — prefer harder
            if (difficulty === "hard") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT;
            } else if (difficulty === "medium") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.5;
            }
            // Easy questions for mastered concepts get no difficulty bonus
        } else if (stats.incorrectCount > 0) {
            // User is struggling — prefer same or easier difficulty
            if (difficulty === "easy") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.8;
            } else if (difficulty === "medium") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.4;
            }
        }
    }

    // Add controlled randomness to prevent purely deterministic selection
    score += Math.random() * WEIGHTS.BASE_RANDOM;

    return score;
}

function normalize01(values: number[]): { min: number; max: number } {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 0 };
    return { min, max };
}

// ─── Question Selection Logic ────────────────────────────────────────────────

/** Tracks the ID of the last served question to prevent immediate repeats */
let lastQuestionId: string | null = null;

/** Counter for reintroducing mistaken concepts */
let questionsSinceMistake = 0;
let pendingMistakeConcepts: ConceptID[] = [];

/**
 * Adds a concept to the pending mistake queue for reintroduction.
 * Called externally when a user answers incorrectly.
 */
export function flagConceptForRevisit(conceptId: ConceptID): void {
    if (!pendingMistakeConcepts.includes(conceptId)) {
        pendingMistakeConcepts.push(conceptId);
    }
}

/**
 * Returns a single resolved question ready for display.
 * Uses the mistake-driven algorithm to bias selection.
 *
 * Algorithm:
 * 1. Check if a mistaken concept needs reintroduction (every 5–10 questions)
 * 2. Score all available questions against the learning profile
 * 3. Select from top-scored candidates with weighted randomness
 * 4. Prevent immediate repeats
 */
export function getNextQuestion(): ResolvedQuestion {
    const profile = getProfile();
    const allQuestions = getAllQuestions();

    // Kick off (non-blocking) ML refresh so the next questions can use it.
    const allConceptIds = Array.from(
        new Set(allQuestions.map((q) => q.conceptId)),
    );
    maybeRefreshMlCache(allConceptIds);

    questionsSinceMistake += 1;

    // Check if we should force-reintroduce a mistaken concept
    if (
        pendingMistakeConcepts.length > 0 &&
        questionsSinceMistake >= 5 + Math.floor(Math.random() * 6) // 5–10 questions
    ) {
        const conceptId = pendingMistakeConcepts.shift()!;
        questionsSinceMistake = 0;

        // Find a question for this concept
        const candidates = allQuestions.filter(
            (q) => q.conceptId === conceptId,
        );
        if (candidates.length > 0) {
            const candidate = candidates[randInt(0, candidates.length - 1)];
            const resolved = candidate.resolve();
            lastQuestionId = resolved.id;
            return resolved;
        }
    }

    // Score all questions (heuristic)
    const heuristicScored = allQuestions.map((q) => ({
        question: q,
        heuristicScore: scoreQuestion(q, profile),
    }));

    const mlWeaknessByConcept = getMlWeaknessByConcept(allConceptIds);

    // Fallback: preserve original behavior when ML isn't available yet.
    const scored = !mlWeaknessByConcept
        ? heuristicScored.map((s) => ({
              question: s.question,
              score: s.heuristicScore,
          }))
        : (() => {
              const { min: hMin, max: hMax } = normalize01(
                  heuristicScored.map((s) => s.heuristicScore),
              );

              return heuristicScored.map((s) => {
                  const hNorm =
                      hMax > hMin
                          ? (s.heuristicScore - hMin) / (hMax - hMin)
                          : 0.5;

                  const ml = mlWeaknessByConcept[s.question.conceptId] ?? 0.5;

                  const finalScore = ml * 0.7 + hNorm * 0.3;
                  return { question: s.question, score: finalScore };
              });
          })();

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick from top 5 candidates (weighted by score)
    const topN = scored.slice(0, Math.min(5, scored.length));
    const totalScore = topN.reduce((sum, s) => sum + s.score, 0);

    let selected: ScoredQuestion;

    if (totalScore === 0) {
        // Fallback: random selection
        selected = topN[randInt(0, topN.length - 1)].question;
    } else {
        // Weighted random selection from top candidates
        let roll = Math.random() * totalScore;
        selected = topN[topN.length - 1].question; // default to last

        for (const entry of topN) {
            roll -= entry.score;
            if (roll <= 0) {
                selected = entry.question;
                break;
            }
        }
    }

    let resolved = selected.resolve();

    // Re-roll once if same as last question
    if (resolved.id === lastQuestionId && allQuestions.length > 1) {
        const fallback = topN.find(
            (s) => s.question.resolve().id !== lastQuestionId,
        );
        if (fallback) {
            resolved = fallback.question.resolve();
        }
    }

    lastQuestionId = resolved.id;
    return resolved;
}

/**
 * Returns a batch of resolved questions for the feed.
 * Used to populate the initial feed and load more questions on scroll.
 */
export function getQuestionBatch(count: number = 10): ResolvedQuestion[] {
    const questions: ResolvedQuestion[] = [];
    for (let i = 0; i < count; i++) {
        questions.push(getNextQuestion());
    }
    return questions;
}
