/**
 * FlashcardService — Provides Anki-style finance flashcards.
 *
 * Responsibilities:
 * - Serve flashcards biased by the user's learning profile
 * - Convert flashcard responses into AnswerEvents for profile updates
 * - Reuse the same mistake-driven concepts as the question feed
 *
 * The flashcard pool covers the same conceptIds as the question pool,
 * so performance in flashcards directly influences home feed selection.
 */

import { getProfile } from "@/services/LearningProfileService";
import type {
    AnswerEvent,
    Flashcard,
    FlashcardResponse,
} from "@/types/questions";

// ─── Flashcard Pool (15+ cards) ──────────────────────────────────────────────

const FLASHCARD_POOL: Flashcard[] = [
    {
        id: "fc-1",
        conceptId: "compound_interest",
        front: "What is compound interest?",
        back: "Interest calculated on the initial principal AND the accumulated interest from previous periods. It makes your money grow exponentially over time.",
        difficulty: "easy",
    },
    {
        id: "fc-2",
        conceptId: "simple_interest",
        front: "How is simple interest calculated?",
        back: "Simple Interest = Principal × Rate × Time. Unlike compound interest, it's only calculated on the original principal amount.",
        difficulty: "easy",
    },
    {
        id: "fc-3",
        conceptId: "rule_of_72",
        front: "What is the Rule of 72?",
        back: "A shortcut to estimate how long it takes to double your money: divide 72 by the annual interest rate. At 8% → 72/8 = 9 years.",
        difficulty: "easy",
    },
    {
        id: "fc-4",
        conceptId: "inflation",
        front: "What is inflation and how does it affect your money?",
        back: "Inflation is the general increase in prices over time. It reduces the purchasing power of money — $100 today buys less than $100 ten years ago.",
        difficulty: "easy",
    },
    {
        id: "fc-5",
        conceptId: "risk_diversification",
        front: "What is portfolio diversification?",
        back: "Spreading investments across different asset classes, sectors, and geographies to reduce unsystematic (company-specific) risk without sacrificing expected returns.",
        difficulty: "easy",
    },
    {
        id: "fc-6",
        conceptId: "stock_valuation",
        front: "What does the P/E ratio tell you?",
        back: "Price-to-Earnings ratio = Stock Price ÷ Earnings Per Share. A high P/E may mean the stock is overvalued or investors expect high future growth.",
        difficulty: "medium",
    },
    {
        id: "fc-7",
        conceptId: "interest_rates",
        front: "Why do bond prices fall when interest rates rise?",
        back: "Existing bonds with lower rates become less attractive compared to new bonds issued at higher rates, so their market price drops to offer a competitive yield.",
        difficulty: "medium",
    },
    {
        id: "fc-8",
        conceptId: "investment_funds",
        front: "What is the difference between an ETF and a mutual fund?",
        back: "ETFs trade on exchanges like stocks throughout the day. Mutual funds are priced once daily at market close. ETFs generally have lower fees and greater tax efficiency.",
        difficulty: "medium",
    },
    {
        id: "fc-9",
        conceptId: "financial_statements",
        front: "What are the three main financial statements?",
        back: "1) Income Statement (revenues & expenses)\n2) Balance Sheet (assets, liabilities, equity)\n3) Cash Flow Statement (cash inflows & outflows)",
        difficulty: "easy",
    },
    {
        id: "fc-10",
        conceptId: "macroeconomics",
        front: "What does GDP measure?",
        back: "Gross Domestic Product measures the total monetary value of all finished goods and services produced within a country's borders in a specific time period.",
        difficulty: "easy",
    },
    {
        id: "fc-11",
        conceptId: "market_cycles",
        front: "What defines a bear market vs. a bull market?",
        back: "Bear market: prices fall 20%+ from recent highs (pessimism). Bull market: prices rise 20%+ from recent lows (optimism). Markets cycle between both.",
        difficulty: "easy",
    },
    {
        id: "fc-12",
        conceptId: "future_value",
        front: "What is the time value of money?",
        back: "Money available today is worth more than the same amount in the future because it can be invested to earn returns. This is the foundation of all finance.",
        difficulty: "medium",
    },
    {
        id: "fc-13",
        conceptId: "compound_interest",
        front: "What is the difference between APR and APY?",
        back: "APR (Annual Percentage Rate) doesn't account for compounding. APY (Annual Percentage Yield) includes compounding effects, making it higher than APR for the same rate.",
        difficulty: "medium",
    },
    {
        id: "fc-14",
        conceptId: "risk_diversification",
        front: "What is the difference between systematic and unsystematic risk?",
        back: "Systematic risk affects the entire market (recession, war) and can't be diversified away. Unsystematic risk is specific to a company/sector and CAN be reduced through diversification.",
        difficulty: "hard",
    },
    {
        id: "fc-15",
        conceptId: "stock_valuation",
        front: "What is a stock's market capitalization?",
        back: "Market Cap = Share Price × Total Shares Outstanding. It represents the total market value of a company. Categories: Small-cap (<$2B), Mid-cap ($2–10B), Large-cap (>$10B).",
        difficulty: "medium",
    },
    {
        id: "fc-16",
        conceptId: "inflation",
        front: "What is the real rate of return?",
        back: "Real Return = Nominal Return − Inflation Rate. If your investment earns 8% but inflation is 3%, your real return is approximately 5%.",
        difficulty: "hard",
    },
    {
        id: "fc-17",
        conceptId: "interest_rates",
        front: "What is the Federal Funds Rate?",
        back: "The interest rate at which banks lend reserves to each other overnight. Set by the Federal Reserve, it influences all other interest rates in the economy.",
        difficulty: "hard",
    },
];

// ─── Selection Logic ─────────────────────────────────────────────────────────

let lastFlashcardId: string | null = null;

/**
 * Returns the next flashcard, biased toward struggled concepts.
 * Uses the same profile data as the question feed.
 */
export function getNextFlashcard(): Flashcard {
    const profile = getProfile();
    const pool = FLASHCARD_POOL;

    // Score each flashcard
    const scored = pool.map((card) => {
        let score = 0;
        const stats = profile.conceptStats[card.conceptId];

        if (!stats) {
            // Unseen concept — moderate boost
            score += 2.0;
        } else {
            // Mistake boost
            const errorRate =
                stats.seenCount > 0
                    ? stats.incorrectCount / stats.seenCount
                    : 0;
            score += errorRate * 3.0;

            // Recency boost
            const minutesAgo = (Date.now() - stats.lastSeenTimestamp) / 60000;
            score += Math.min(minutesAgo / 10, 1) * 1.5;
        }

        // Randomness
        score += Math.random() * 0.5;

        return { card, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick from top 5
    const topN = scored.slice(0, Math.min(5, scored.length));

    let selected = topN[0].card;

    // Avoid immediate repeat
    if (selected.id === lastFlashcardId && topN.length > 1) {
        selected = topN[1].card;
    }

    lastFlashcardId = selected.id;
    return selected;
}

/**
 * Converts a flashcard response into an AnswerEvent for the learning profile.
 *
 * Mapping:
 * - "knew_it"     → correct, fast response
 * - "unsure"      → correct but slow (signals weak knowledge)
 * - "didnt_know"  → incorrect
 */
export function flashcardResponseToAnswerEvent(
    flashcard: Flashcard,
    response: FlashcardResponse,
    timeSpentMs: number,
): AnswerEvent {
    const correct = response === "knew_it";
    // "unsure" is treated as correct but with inflated response time
    const adjustedTime =
        response === "unsure" ? timeSpentMs * 1.5 : timeSpentMs;

    return {
        questionId: flashcard.id,
        conceptId: flashcard.conceptId,
        difficulty: flashcard.difficulty,
        correct,
        responseTimeMs: adjustedTime,
        questionType: "flashcard",
    };
}

/** Returns the total number of available flashcards */
export function getFlashcardCount(): number {
    return FLASHCARD_POOL.length;
}
