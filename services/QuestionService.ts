/**
 * QuestionService — local mock backend for the Finance-IT app.
 *
 * Responsibilities:
 * - Serve questions to the home feed
 * - Randomly select between MCQ (60%) and numeric (40%) questions
 * - Generate numeric questions with randomized parameters
 * - Prevent immediate repeats
 *
 * Future extension point: Replace this with a real API client
 * that fetches questions from a backend service.
 */

import type {
    GeneratedQuestionTemplate,
    MCQQuestion,
    ResolvedQuestion,
} from "@/types/questions";

// ─── Static MCQ Question Pool (at least 10) ─────────────────────────────────

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
    },
    {
        id: "mcq-5",
        type: "mcq",
        question: "A P/E ratio compares a stock's price to its:",
        options: ["Revenue", "Earnings per share", "Dividends", "Book value"],
        correctIndex: 1,
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
        generator: () => {
            const principal = randInt(1, 50) * 1000; // $1,000 – $50,000
            const rate = randInt(2, 12); // 2% – 12%
            const years = randInt(1, 10);
            const answer = round2(principal * Math.pow(1 + rate / 100, years));
            return {
                questionText: `You invest $${principal.toLocaleString()} at ${rate}% annual compound interest. How much will you have after ${years} year${years > 1 ? "s" : ""}?`,
                correctAnswer: answer,
                tolerance: answer * 0.01, // ±1%
            };
        },
    },
    {
        id: "num-simple-interest",
        type: "numeric",
        template: "Simple interest calculation",
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
        generator: () => {
            const rate = randInt(2, 12);
            const answer = round2(72 / rate);
            return {
                questionText: `Using the Rule of 72, approximately how many years will it take to double your money at a ${rate}% annual return? (Round to the nearest whole number)`,
                correctAnswer: Math.round(answer),
                tolerance: 1, // Accept ±1 year
            };
        },
    },
    {
        id: "num-future-value-annuity",
        type: "numeric",
        template: "Future value of monthly savings",
        generator: () => {
            const monthly = randInt(1, 10) * 100; // $100 – $1,000
            const rate = randInt(4, 10); // annual rate
            const years = randInt(2, 10);
            const r = rate / 100 / 12; // monthly rate
            const n = years * 12; // total months
            const fv = round2(monthly * ((Math.pow(1 + r, n) - 1) / r));
            return {
                questionText: `You save $${monthly} per month for ${years} years at ${rate}% annual interest (compounded monthly). What is the total future value?`,
                correctAnswer: fv,
                tolerance: fv * 0.01,
            };
        },
    },
];

// ─── Question Selection Logic ────────────────────────────────────────────────

/** Tracks the ID of the last served question to prevent immediate repeats */
let lastQuestionId: string | null = null;

/**
 * Returns a single resolved question ready for display.
 * - 60% chance of MCQ, 40% chance of numeric
 * - Prevents immediate repeats by re-rolling if the same question ID is picked
 *
 * Future extension point: Replace with an API call to fetch questions
 * from a remote server. The return type (ResolvedQuestion) stays the same.
 */
export function getNextQuestion(): ResolvedQuestion {
    const isMCQ = Math.random() < 0.6;

    if (isMCQ) {
        let question: MCQQuestion;
        // Re-roll to avoid immediate repeat
        do {
            question = MCQ_POOL[randInt(0, MCQ_POOL.length - 1)];
        } while (question.id === lastQuestionId && MCQ_POOL.length > 1);

        lastQuestionId = question.id;
        return { ...question };
    } else {
        let template: GeneratedQuestionTemplate;
        // Re-roll to avoid same template type back-to-back
        do {
            template =
                NUMERIC_TEMPLATES[randInt(0, NUMERIC_TEMPLATES.length - 1)];
        } while (
            template.id === lastQuestionId &&
            NUMERIC_TEMPLATES.length > 1
        );

        const generated = template.generator();
        lastQuestionId = template.id;

        return {
            id: `${template.id}-${Date.now()}`,
            type: "numeric",
            questionText: generated.questionText,
            correctAnswer: generated.correctAnswer,
            tolerance: generated.tolerance ?? generated.correctAnswer * 0.01,
        };
    }
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
