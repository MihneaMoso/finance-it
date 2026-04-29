
export type ConceptID = string;

/** Difficulty level for questions and flashcards */
export type Difficulty = "easy" | "medium" | "hard";


/** Multiple-choice question with fixed options */
export type MCQQuestion = {
    id: string;
    type: "mcq";
    question: string;
    options: string[];

    correctIndex: number;

    conceptId: ConceptID;

    difficulty: Difficulty;
};


export type GeneratedQuestionResult = {
    questionText: string;
    correctAnswer: number;

    tolerance?: number;

    templateId?: string;

    params?: Record<string, number>;
};


export type GeneratedQuestionTemplate = {
    id: string;
    type: "numeric";
    template: string;

    conceptId: ConceptID;

    difficulty: Difficulty;

    generator: () => GeneratedQuestionResult;
};


export type Question =
    | (MCQQuestion & { generatedData?: never })
    | (GeneratedQuestionTemplate & { generatedData: GeneratedQuestionResult });


export type ResolvedQuestion =
    | MCQQuestion
    | {
          id: string;
          type: "numeric";
          questionText: string;
          correctAnswer: number;
          tolerance: number;

          templateId?: string;
          params?: Record<string, number>;

          conceptId: ConceptID;

          difficulty: Difficulty;
      };


export type ConceptStats = {
    seenCount: number;
    correctCount: number;
    incorrectCount: number;
    averageResponseTimeMs: number;
    lastSeenTimestamp: number;
    
    confidenceLevel?: number;
};


export type UserLearningProfile = {
    
    userId?: string;

    totalAnswered: number;
    correctAnswers: number;

    conceptStats: Record<ConceptID, ConceptStats>;

    difficultyBias: {
        easy: number;
        medium: number;
        hard: number;
    };
};

export type HeartsState = {
    
    userId?: string;

    current: number;
    max: number;
    lastReset: number;
};

export type LessonStatus = "locked" | "available" | "completed";

export type Chapter = {
    id: string;
    title: TranslatableText;
    order: number;
};

export type ChapterNodeType = "lesson" | "simulation" | "chapter_test";

export type LessonNode = {
    id: string;
    type: ChapterNodeType;
    title: TranslatableText;
    conceptIds: ConceptID[];
    difficulty: Difficulty;
    status: LessonStatus;
    order: number;

    /** Groups nodes into chapters */
    chapterId: string;

    /** Optional island layout metadata (UI-only, safe to ignore server-side) */
    ui?: {
        islandIndex?: number;
        x?: number; // 0..1
        y?: number; // 0..1
    };
};

export type LessonContentSlide = {
    id: string;
    title: TranslatableText;
    content: TranslatableText;
};

export type Lesson = {
    id: string;
    title: TranslatableText;
    slides: LessonContentSlide[];
    /**
     * Lesson quiz questions.
     * Note: Uses existing Question union type (MCQ & numeric templates),
     * so the quiz can reuse QuestionCard components.
     */
    questions: Question[];
};

export type SimulationStep = {
    id: string;
    type: "story" | "question";
    content: TranslatableText;

    /** Only for question steps */
    question?: Question;

    /** Optional branching (future-ready) */
    nextStepId?: string;
};

export type Simulation = {
    id: string;
    title: TranslatableText;
    steps: SimulationStep[];
    conceptIds: ConceptID[];
};

export type LessonProgressState = {
    /**
     * Auth readiness:
     * TODO: Replace with Clerk user ID when auth is enabled.
     */
    userId?: string;

    completedNodeIds: string[];
    lastUpdated: number;
};


export type TranslatableText = Record<string, string>;


export type UserSkillScore = number;


export type FeatureVector = number[];

export type UserProfile = {
    name: string;
    email: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
};


export type AnswerEvent = {
    questionId?: string;
    conceptId: ConceptID;
    difficulty: Difficulty;
    correct: boolean;
    responseTimeMs: number;
    timestamp?: number;
    source?: "feed" | "flashcard" | "lesson" | "simulation";
    questionType?: "mcq" | "numeric" | "flashcard";
};

export type FlashcardResponse = "didnt_know" | "unsure" | "knew_it";


export type FlashcardReviewEvent = {
    flashcardId: string;
    conceptId: ConceptID;
    difficulty: Difficulty;
    response: FlashcardResponse;
    correct: boolean;
    responseTimeMs: number;
    timestamp: number;
};

export type Flashcard = {
    id: string;
    conceptId: ConceptID;
    difficulty: Difficulty;
    front: TranslatableText;
    back: TranslatableText;
};
