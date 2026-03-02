/**
 * Question & Learning type definitions for the Finance-IT app.
 *
 * Two question types are supported:
 * - MCQ: Multiple-choice questions with a fixed set of options
 * - Numeric: Dynamically generated questions with numeric answers
 *
 * Learning types support the mistake-driven feed algorithm
 * and flashcard system.
 */

// ─── Concept & Difficulty ────────────────────────────────────────────────────

/** Unique identifier for a finance concept (e.g. "compound_interest") */
export type ConceptID = string;

/** Difficulty level for questions and flashcards */
export type Difficulty = "easy" | "medium" | "hard";

// ─── Question Types ──────────────────────────────────────────────────────────

/** Multiple-choice question with fixed options */
export type MCQQuestion = {
    id: string;
    type: "mcq";
    question: string;
    options: string[];
    /** Index of the correct option in the options array */
    correctIndex: number;
    /** The finance concept this question tests */
    conceptId: ConceptID;
    /** Difficulty level */
    difficulty: Difficulty;
};

/** Result of generating a numeric question from a template */
export type GeneratedQuestionResult = {
    questionText: string;
    correctAnswer: number;
    /** Acceptable tolerance for the answer (default: 1% of correctAnswer) */
    tolerance?: number;
};

/** Template for dynamically generated numeric questions */
export type GeneratedQuestionTemplate = {
    id: string;
    type: "numeric";
    template: string;
    /** The finance concept this template tests */
    conceptId: ConceptID;
    /** Difficulty level */
    difficulty: Difficulty;
    /** Generator function that produces randomized question text and correct answer */
    generator: () => GeneratedQuestionResult;
};

/** Union type for any question served to the feed */
export type Question =
    | (MCQQuestion & { generatedData?: never })
    | (GeneratedQuestionTemplate & { generatedData: GeneratedQuestionResult });

/** Resolved question ready for display — either MCQ or a generated numeric question */
export type ResolvedQuestion =
    | MCQQuestion
    | {
          id: string;
          type: "numeric";
          questionText: string;
          correctAnswer: number;
          tolerance: number;
          /** The finance concept this question tests */
          conceptId: ConceptID;
          /** Difficulty level */
          difficulty: Difficulty;
      };

// ─── Learning Profile Types ──────────────────────────────────────────────────

/** Per-concept performance statistics */
export type ConceptStats = {
    seenCount: number;
    correctCount: number;
    incorrectCount: number;
    averageResponseTimeMs: number;
    lastSeenTimestamp: number;
    /**
     * Reserved for future ML-based confidence scoring.
     * TODO: Populate via ML inference when ranking model is integrated.
     */
    confidenceLevel?: number;
};

/**
 * User learning profile that evolves over time.
 *
 * This is the central data structure for the mistake-driven learning system.
 * It tracks per-concept performance and difficulty progression.
 *
 * Future ML consumption:
 * - conceptStats can be vectorized into feature arrays
 * - difficultyBias tracks progression through difficulty tiers
 * - totalAnswered / correctAnswers provide global accuracy signals
 */
export type UserLearningProfile = {
    totalAnswered: number;
    correctAnswers: number;

    conceptStats: Record<ConceptID, ConceptStats>;

    difficultyBias: {
        easy: number;
        medium: number;
        hard: number;
    };
};

/**
 * Event emitted when a user answers a question.
 * Used to update the learning profile.
 */
export type AnswerEvent = {
    questionId: string;
    conceptId: ConceptID;
    difficulty: Difficulty;
    correct: boolean;
    responseTimeMs: number;
    questionType: "mcq" | "numeric" | "flashcard";
};

// ─── Flashcard Types ─────────────────────────────────────────────────────────

/** A flashcard for Anki-style review */
export type Flashcard = {
    id: string;
    conceptId: ConceptID;
    front: string;
    back: string;
    difficulty: Difficulty;
};

/** User self-assessment after viewing a flashcard answer */
export type FlashcardResponse = "knew_it" | "unsure" | "didnt_know";

// ─── ML Readiness Types ─────────────────────────────────────────────────────

/**
 * User skill score (0–100) for future ranking system.
 * TODO: Compute via ML model when inference pipeline is ready.
 */
export type UserSkillScore = number;

/**
 * Feature vector for ML model input.
 * Each element represents a normalized signal about user performance.
 * TODO: Define exact feature schema when model architecture is finalized.
 */
export type FeatureVector = number[];

/** User profile placeholder (Clerk integration point) */
export type UserProfile = {
    name: string;
    email: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
};
