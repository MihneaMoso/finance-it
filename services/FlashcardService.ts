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

const t = (en: string, ro?: string) => ({
    en,
    ro: ro ?? en,
});

// ─── Flashcard Pool (15+ cards) ──────────────────────────────────────────────

const FLASHCARD_POOL: Flashcard[] = [
    {
        id: "fc-1",
        conceptId: "compound_interest",
        front: t("What is compound interest?", "Ce este dobânda compusă?"),
        back: t(
            "Interest calculated on the initial principal AND the accumulated interest from previous periods. It makes your money grow exponentially over time.",
            "Dobânda calculată pe principalul inițial ȘI pe dobânda acumulată din perioadele anterioare. Îți crește banii exponențial în timp.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-2",
        conceptId: "simple_interest",
        front: t(
            "How is simple interest calculated?",
            "Cum se calculează dobânda simplă?",
        ),
        back: t(
            "Simple Interest = Principal × Rate × Time. Unlike compound interest, it's only calculated on the original principal amount.",
            "Dobânda simplă = Principal × Rată × Timp. Spre deosebire de dobânda compusă, se calculează doar pe principalul inițial.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-3",
        conceptId: "rule_of_72",
        front: t("What is the Rule of 72?", "Ce este regula lui 72?"),
        back: t(
            "A shortcut to estimate how long it takes to double your money: divide 72 by the annual interest rate. At 8% → 72/8 = 9 years.",
            "Un truc pentru a estima în cât timp ți se dublează banii: împarte 72 la rata anuală a dobânzii. La 8% → 72/8 = 9 ani.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-4",
        conceptId: "inflation",
        front: t(
            "What is inflation and how does it affect your money?",
            "Ce este inflația și cum îți afectează banii?",
        ),
        back: t(
            "Inflation is the general increase in prices over time. It reduces the purchasing power of money — $100 today buys less than $100 ten years ago.",
            "Inflația este creșterea generală a prețurilor în timp. Reduce puterea de cumpărare — 100$ azi cumpără mai puțin decât 100$ acum 10 ani.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-5",
        conceptId: "risk_diversification",
        front: t(
            "What is portfolio diversification?",
            "Ce este diversificarea portofoliului?",
        ),
        back: t(
            "Spreading investments across different asset classes, sectors, and geographies to reduce unsystematic (company-specific) risk without sacrificing expected returns.",
            "Împrăștierea investițiilor între clase de active, sectoare și regiuni pentru a reduce riscul nesistematic (specific unei companii) fără a sacrifica randamentele așteptate.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-6",
        conceptId: "stock_valuation",
        front: t(
            "What does the P/E ratio tell you?",
            "Ce îți spune raportul P/E?",
        ),
        back: t(
            "Price-to-Earnings ratio = Stock Price ÷ Earnings Per Share. A high P/E may mean the stock is overvalued or investors expect high future growth.",
            "Raportul Preț-Câștig = Preț Acțiune ÷ Câștig Pe Acțiune. Un P/E mare poate însemna că acțiunea este supraevaluată sau că investitorii se așteaptă la o creștere mare în viitor.",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-7",
        conceptId: "interest_rates",
        front: t(
            "Why do bond prices fall when interest rates rise?",
            "De ce scad prețurile obligațiunilor când cresc ratele dobânzilor?",
        ),
        back: t(
            "Existing bonds with lower rates become less attractive compared to new bonds issued at higher rates, so their market price drops to offer a competitive yield.",
            "Obligațiunile existente cu rate mai mici devin mai puțin atractive comparativ cu obligațiunile noi emise la rate mai mari, astfel încât prețul lor pe piață scade pentru a oferi un randament competitiv.",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-8",
        conceptId: "investment_funds",
        front: t(
            "What is the difference between an ETF and a mutual fund?",
            "Care este diferența dintre un ETF și un fond mutual?",
        ),
        back: t(
            "ETFs trade on exchanges like stocks throughout the day. Mutual funds are priced once daily at market close. ETFs generally have lower fees and greater tax efficiency.",
            "ETF-urile se tranzacționează pe burse ca acțiunile pe parcursul zilei. Fondurile mutuale sunt evaluate o dată pe zi la închiderea pieței. ETF-urile au, în general, comisioane mai mici și o eficiență fiscală mai mare.",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-9",
        conceptId: "financial_statements",
        front: t(
            "What are the three main financial statements?",
            "Care sunt cele trei state financiare principale?",
        ),
        back: t(
            "1) Income Statement (revenues & expenses)\n2) Balance Sheet (assets, liabilities, equity)\n3) Cash Flow Statement (cash inflows & outflows)",
            "1) Contul de profit și pierdere (venituri și cheltuieli)\n2) Bilanțul (active, pasive, capitaluri proprii)\n3) Declarația de fluxuri de numerar (fluxuri de numerar în și din afacere)",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-10",
        conceptId: "macroeconomics",
        front: t("What does GDP measure?", "Ce măsoară PIB-ul?"),
        back: t(
            "Gross Domestic Product measures the total monetary value of all finished goods and services produced within a country's borders in a specific time period.",
            "Produsul Intern Brut măsoară valoarea monetară totală a tuturor bunurilor și serviciilor finite produse în interiorul granițelor unei țări într-o perioadă de timp specifică.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-11",
        conceptId: "market_cycles",
        front: t(
            "What defines a bear market vs. a bull market?",
            "Ce definește o piață bear vs. o piață bull?",
        ),
        back: t(
            "Bear market: prices fall 20%+ from recent highs (pessimism). Bull market: prices rise 20%+ from recent lows (optimism). Markets cycle between both.",
            "Piață bear: prețurile scad cu 20%+ față de maximele recente (pessimism). Piață bull: prețurile cresc cu 20%+ față de minimele recente (optimism). Piețele oscilează între ambele.",
        ),
        difficulty: "easy",
    },
    {
        id: "fc-12",
        conceptId: "future_value",
        front: t(
            "What is the time value of money?",
            "Ce este valoarea temporală a banilor?",
        ),
        back: t(
            "Money available today is worth more than the same amount in the future because it can be invested to earn returns. This is the foundation of all finance.",
            "Banii disponibili astăzi valorează mai mult decât aceeași sumă în viitor pentru că pot fi investiți pentru a obține randamente. Aceasta este fundația tuturor finanțelor.",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-13",
        conceptId: "compound_interest",
        front: t(
            "What is the difference between APR and APY?",
            "Care este diferența dintre APR și APY?",
        ),
        back: t(
            "APR (Annual Percentage Rate) doesn't account for compounding. APY (Annual Percentage Yield) includes compounding effects, making it higher than APR for the same rate.",
            "APR (Rata Percentuală Anuală) nu ține cont de capitalizare. APY (Randamentul Percentual Anual) include efectele capitalizării, făcându-l mai mare decât APR pentru aceeași rată.",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-14",
        conceptId: "risk_diversification",
        front: t(
            "What is the difference between systematic and unsystematic risk?",
            "Care este diferența dintre riscul sistematic și riscul nesistematic?",
        ),
        back: t(
            "Systematic risk affects the entire market (recession, war) and can't be diversified away. Unsystematic risk is specific to a company/sector and CAN be reduced through diversification.",
            "Riscul sistematic afectează întreaga piață (recesiune, război) și nu poate fi eliminat prin diversificare. Riscul nesistematic este specific unei companii/sectoare și POATE fi redus prin diversificare.",
        ),
        difficulty: "hard",
    },
    {
        id: "fc-15",
        conceptId: "stock_valuation",
        front: t(
            "What is a stock's market capitalization?",
            "Ce este capitalizarea de piață a unei acțiuni?",
        ),
        back: t(
            "Market Cap = Share Price × Total Shares Outstanding. It represents the total market value of a company. Categories: Small-cap (<$2B), Mid-cap ($2–10B), Large-cap (>$10B).",
            "Capitalizarea de piață = Preț Acțiune × Număr Total Acțiuni. Reprezintă valoarea totală de piață a unei companii. Categorii: Small-cap (<2 miliarde $), Mid-cap (2–10 miliarde $), Large-cap (>10 miliarde $).",
        ),
        difficulty: "medium",
    },
    {
        id: "fc-16",
        conceptId: "inflation",
        front: t(
            "What is the real rate of return?",
            "Ce este rata reală de returnare?",
        ),
        back: t(
            "Real Return = Nominal Return − Inflation Rate. If your investment earns 8% but inflation is 3%, your real return is approximately 5%.",
            "Returnare reală = Returnare nominală − Rata inflației. Dacă investiția ta aduce 8% dar inflația este de 3%, returnarea ta reală este de aproximativ 5%.",
        ),
        difficulty: "hard",
    },
    {
        id: "fc-17",
        conceptId: "interest_rates",
        front: t(
            "What is the Federal Funds Rate?",
            "Ce este rata fondurilor federale?",
        ),
        back: t(
            "The interest rate at which banks lend reserves to each other overnight. Set by the Federal Reserve, it influences all other interest rates in the economy.",
            "Rata dobânzii la care băncile împrumută rezerve între ele peste noapte. Stabilită de Rezerva Federală, influențează toate celelalte rate ale dobânzii din economie.",
        ),
        difficulty: "hard",
    },
];

export function getFlashcardPool(): Flashcard[] {
    return FLASHCARD_POOL;
}

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
