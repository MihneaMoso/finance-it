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

    
    if (mlCache.pCorrectByConcept) {
        for (const cid of conceptIds) {
            const p = mlCache.pCorrectByConcept[cid];
            if (typeof p === "number")
                weakness[cid] = Math.max(0, Math.min(1, 1 - p));
        }
    }

    
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

type SupportedLang = "en" | "ro";

function normalizeLang(lang?: string): SupportedLang {
    return lang?.toLowerCase().startsWith("ro") ? "ro" : "en";
}

const MCQ_TEXT_BY_LANG: Record<
    SupportedLang,
    Record<string, { question: string; options: string[] }>
> = {
    en: {},
    ro: {
        "mcq-1": {
            question:
                "Dacă ratele dobânzilor cresc, ce se întâmplă de obicei cu prețurile obligațiunilor?",
            options: ["Cresc", "Scad", "Rămân la fel", "Devine volatil"],
        },
        "mcq-2": {
            question: "Ce ajută în principal diversificarea să reducă?",
            options: [
                "Obligația fiscală",
                "Riscul nesistematic",
                "Inflația",
                "Costurile de tranzacționare",
            ],
        },
        "mcq-3": {
            question:
                "Ce situație financiară arată veniturile, cheltuielile și profitul pe o perioadă?",
            options: [
                "Bilanț",
                "Situația fluxurilor de numerar",
                "Contul de profit și pierdere",
                "Situația capitalurilor proprii",
            ],
        },
        "mcq-4": {
            question: "La ce este folosită „Regula lui 72” pentru a estima?",
            options: [
                "Timpul necesar pentru a dubla o investiție",
                "Pierderea maximă a portofoliului",
                "Alocarea optimă a activelor",
                "Deduceri fiscale",
            ],
        },
        "mcq-5": {
            question: "Un raport P/E compară prețul unei acțiuni cu:",
            options: [
                "Venituri",
                "Câștigul pe acțiune (EPS)",
                "Dividende",
                "Valoarea contabilă",
            ],
        },
        "mcq-6": {
            question:
                "Care tip de fond are de obicei cele mai mici comisioane?",
            options: [
                "Fond de hedging",
                "Fond mutual",
                "Fond index",
                "Fond de private equity",
            ],
        },
        "mcq-7": {
            question: "Ce înseamnă PIB (GDP)?",
            options: [
                "Produs Intern Brut",
                "Prețuri interne generale",
                "Procentajul cererii de creștere",
                "Profit brut al cererii",
            ],
        },
        "mcq-8": {
            question: "O „piață bear” este de obicei definită ca:",
            options: [
                "O piață care crește cu 20% sau mai mult",
                "O piață care scade cu 20% sau mai mult",
                "O piață cu volatilitate ridicată",
                "O piață cu volum scăzut de tranzacționare",
            ],
        },
        "mcq-9": {
            question: "Care activ este considerat în general cel mai sigur?",
            options: [
                "Obligațiuni corporative",
                "Acțiuni",
                "Bonuri de trezorerie ale SUA",
                "Criptomonedă",
            ],
        },
        "mcq-10": {
            question: "Dobânda compusă diferă de dobânda simplă deoarece:",
            options: [
                "Folosește o rată mai mică",
                "Este calculată doar anual",
                "Generează dobândă și peste dobânda acumulată anterior",
                "Se aplică doar conturilor de economii",
            ],
        },
        "mcq-11": {
            question: "Ce înseamnă ETF?",
            options: [
                "Fond de transfer electronic",
                "Fond tranzacționat la bursă",
                "Fond fiduciar de acțiuni",
                "Depunere fiscală estimată",
            ],
        },
        "mcq-12": {
            question: "Inflația tinde să facă ce cu puterea de cumpărare?",
            options: [
                "Să crească",
                "Să scadă",
                "Să rămână neschimbată",
                "Să fluctueze aleatoriu",
            ],
        },
    },
};

function localizeMCQ(mcq: MCQQuestion, lang?: string): MCQQuestion {
    const normalized = normalizeLang(lang);
    if (normalized === "en") return mcq;
    const tr = MCQ_TEXT_BY_LANG[normalized][mcq.id];
    if (!tr) return mcq;
    return { ...mcq, question: tr.question, options: tr.options };
}

type NumericTemplateId =
    | "num-compound-interest"
    | "num-simple-interest"
    | "num-rule-of-72"
    | "num-future-value-annuity";

function formatYears(years: number, lang: SupportedLang): string {
    if (lang === "ro") return years === 1 ? "1 an" : `${years} ani`;
    return years === 1 ? "1 year" : `${years} years`;
}

function formatNumericQuestionText(
    templateId: NumericTemplateId,
    params: Record<string, number>,
    lang?: string,
): string {
    const normalized = normalizeLang(lang);

    switch (templateId) {
        case "num-compound-interest": {
            const principal = params.principal;
            const rate = params.rate;
            const years = params.years;
            if (normalized === "ro") {
                return `Investești $${principal.toLocaleString()} la o dobândă anuală compusă de ${rate}%. Câți bani vei avea după ${formatYears(
                    years,
                    normalized,
                )}?`;
            }
            return `You invest $${principal.toLocaleString()} at ${rate}% annual compound interest. How much will you have after ${formatYears(
                years,
                normalized,
            )}?`;
        }
        case "num-simple-interest": {
            const principal = params.principal;
            const rate = params.rate;
            const years = params.years;
            if (normalized === "ro") {
                return `Depui $${principal.toLocaleString()} într-un cont care oferă dobândă simplă de ${rate}% pe an. Care este suma totală după ${formatYears(
                    years,
                    normalized,
                )}?`;
            }
            return `You deposit $${principal.toLocaleString()} in an account earning ${rate}% simple interest per year. What is the total amount after ${formatYears(
                years,
                normalized,
            )}?`;
        }
        case "num-rule-of-72": {
            const rate = params.rate;
            if (normalized === "ro") {
                return `Folosind Regula lui 72, aproximativ câți ani sunt necesari pentru a-ți dubla banii la un randament anual de ${rate}%? (Rotunjește la cel mai apropiat număr întreg)`;
            }
            return `Using the Rule of 72, approximately how many years will it take to double your money at a ${rate}% annual return? (Round to the nearest whole number)`;
        }
        case "num-future-value-annuity": {
            const monthly = params.monthly;
            const rate = params.rate;
            const years = params.years;
            if (normalized === "ro") {
                return `Economisești $${monthly.toLocaleString()} pe lună timp de ${formatYears(
                    years,
                    normalized,
                )} la o dobândă anuală de ${rate}% (capitalizare lunară). Care este valoarea viitoare totală?`;
            }
            return `You save $${monthly.toLocaleString()} per month for ${formatYears(
                years,
                normalized,
            )} at ${rate}% annual interest (compounded monthly). What is the total future value?`;
        }
        default:
            return normalized === "ro"
                ? "Întrebare numerică"
                : "Numeric question";
    }
}

export function localizeResolvedQuestion(
    question: ResolvedQuestion,
    lang?: string,
): ResolvedQuestion {
    if (question.type === "mcq") {
        return localizeMCQ(question, lang);
    }

    const templateId = question.templateId as NumericTemplateId | undefined;
    if (!templateId || !question.params) return question;

    return {
        ...question,
        questionText: formatNumericQuestionText(
            templateId,
            question.params,
            lang,
        ),
    };
}

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
                templateId: "num-compound-interest",
                params: { principal, rate, years },
                questionText: formatNumericQuestionText(
                    "num-compound-interest",
                    { principal, rate, years },
                    "en",
                ),
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
                templateId: "num-simple-interest",
                params: { principal, rate, years },
                questionText: formatNumericQuestionText(
                    "num-simple-interest",
                    { principal, rate, years },
                    "en",
                ),
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
                templateId: "num-rule-of-72",
                params: { rate },
                questionText: formatNumericQuestionText(
                    "num-rule-of-72",
                    { rate },
                    "en",
                ),
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
                templateId: "num-future-value-annuity",
                params: { monthly, rate, years },
                questionText: formatNumericQuestionText(
                    "num-future-value-annuity",
                    { monthly, rate, years },
                    "en",
                ),
                correctAnswer: fv,
                tolerance: fv * 0.01,
            };
        },
    },
];


type ScoredQuestion = {
    resolve: () => ResolvedQuestion;
    conceptId: ConceptID;
    difficulty: Difficulty;
};

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
                    templateId: generated.templateId,
                    params: generated.params,
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

        
        const timeSinceLastSeen = Date.now() - stats.lastSeenTimestamp;
        const minutesSinceLastSeen = timeSinceLastSeen / 60000;
        score += Math.min(minutesSinceLastSeen / 10, 1) * WEIGHTS.RECENCY;

        
        if (stats.correctCount >= 3 && stats.incorrectCount === 0) {
            
            if (difficulty === "hard") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT;
            } else if (difficulty === "medium") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.5;
            }
            
        } else if (stats.incorrectCount > 0) {
            
            if (difficulty === "easy") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.8;
            } else if (difficulty === "medium") {
                score += WEIGHTS.DIFFICULTY_ADJUSTMENT * 0.4;
            }
        }
    }

    
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


let lastQuestionId: string | null = null;


let questionsSinceMistake = 0;
let pendingMistakeConcepts: ConceptID[] = [];


export function flagConceptForRevisit(conceptId: ConceptID): void {
    if (!pendingMistakeConcepts.includes(conceptId)) {
        pendingMistakeConcepts.push(conceptId);
    }
}

/**
 * Algorithm:
 * 1. Check if a mistaken concept needs reintroduction (every 5–10 questions)
 * 2. Score all available questions against the learning profile
 * 3. Select from top-scored candidates with weighted randomness
 * 4. Prevent immediate repeats
 */
export function getNextQuestion(): ResolvedQuestion {
    const profile = getProfile();
    const allQuestions = getAllQuestions();

    
    const allConceptIds = Array.from(
        new Set(allQuestions.map((q) => q.conceptId)),
    );
    maybeRefreshMlCache(allConceptIds);

    questionsSinceMistake += 1;

    
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

    
    const heuristicScored = allQuestions.map((q) => ({
        question: q,
        heuristicScore: scoreQuestion(q, profile),
    }));

    const mlWeaknessByConcept = getMlWeaknessByConcept(allConceptIds);

    // Fallback
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

    
    scored.sort((a, b) => b.score - a.score);

    
    const topN = scored.slice(0, Math.min(5, scored.length));
    const totalScore = topN.reduce((sum, s) => sum + s.score, 0);

    let selected: ScoredQuestion;

    if (totalScore === 0) {
        // Fallback
        selected = topN[randInt(0, topN.length - 1)].question;
    } else {
        
        let roll = Math.random() * totalScore;
        selected = topN[topN.length - 1].question;

        for (const entry of topN) {
            roll -= entry.score;
            if (roll <= 0) {
                selected = entry.question;
                break;
            }
        }
    }

    let resolved = selected.resolve();

    
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


export function getQuestionBatch(count: number = 10): ResolvedQuestion[] {
    const questions: ResolvedQuestion[] = [];
    for (let i = 0; i < count; i++) {
        questions.push(getNextQuestion());
    }
    return questions;
}


export function getQuestionBatchLocalized(
    count: number = 10,
    lang?: string,
): ResolvedQuestion[] {
    return getQuestionBatch(count).map((q) =>
        localizeResolvedQuestion(q, lang),
    );
}
