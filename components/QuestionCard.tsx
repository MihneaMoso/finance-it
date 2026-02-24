/**
 * QuestionCard — Wrapper component that renders the correct card type
 * based on the question's type field.
 *
 * This is the main component rendered per feed item.
 * It delegates to MCQCard or NumericCard based on question.type.
 */

import React from "react";

import { MCQCard } from "@/components/MCQCard";
import { NumericCard } from "@/components/NumericCard";
import type { ResolvedQuestion } from "@/types/questions";

type QuestionCardProps = {
    question: ResolvedQuestion;
};

export function QuestionCard({ question }: QuestionCardProps) {
    if (question.type === "mcq") {
        return <MCQCard question={question} />;
    }

    return <NumericCard question={question} />;
}
