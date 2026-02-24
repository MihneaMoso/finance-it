/**
 * Question type definitions for the Finance-IT app.
 * Two question types are supported:
 * - MCQ: Multiple-choice questions with a fixed set of options
 * - Numeric: Dynamically generated questions with numeric answers
 */

/** Multiple-choice question with fixed options */
export type MCQQuestion = {
    id: string;
    type: "mcq";
    question: string;
    options: string[];
    /** Index of the correct option in the options array */
    correctIndex: number;
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
      };

/** User profile placeholder (Clerk integration point) */
export type UserProfile = {
    name: string;
    email: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
};
