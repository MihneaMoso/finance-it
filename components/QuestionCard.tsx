/**
 * QuestionCard — Wrapper component that renders the correct card type
 * based on the question's type field.
 *
 * This is the main component rendered per feed item.
 * It delegates to MCQCard or NumericCard based on question.type.
 * It also generates contextual hints based on the user's learning profile.
 */

import React from "react";

import { MCQCard } from "@/components/MCQCard";
import { NumericCard } from "@/components/NumericCard";
import { getConceptStats } from "@/services/LearningProfileService";
import type { ResolvedQuestion } from "@/types/questions";

type QuestionCardProps = {
    question: ResolvedQuestion;
};

/**
 * Generates a contextual hint based on the user's history with a concept.
 * Returns null if no special context applies.
 */
function getContextHint(conceptId: string): string | null {
    const stats = getConceptStats(conceptId);

    if (stats.seenCount === 0) return null;

    if (stats.incorrectCount > stats.correctCount) {
        return "You struggled with this earlier";
    }

    if (stats.seenCount >= 3 && stats.incorrectCount > 0) {
        return "Based on your past answers";
    }

    return null;
}

export function QuestionCard({ question }: QuestionCardProps) {
    const hint = getContextHint(question.conceptId);

    if (question.type === "mcq") {
        return <MCQCard question={question} contextHint={hint} />;
    }

    return <NumericCard question={question} contextHint={hint} />;
}
