/**
 * NumericCard — Renders a dynamically generated numeric finance question.
 *
 * Features:
 * - Displays generated question text
 * - Numeric input field with submit button
 * - Accepts answers within a configurable tolerance (default ±1%)
 * - Immediate visual feedback after submission
 * - Reports answer events to the learning profile
 * - Shows contextual hints for revisited concepts
 * - Disables re-submission after first attempt
 */

import { useUser } from "@clerk/clerk-expo";
import React, { useRef, useState } from "react";
import {
    Keyboard,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
    isStruggledConcept,
    recordAnswerAndSync,
} from "@/services/LearningProfileService";
import { flagConceptForRevisit } from "@/services/QuestionService";
import type { ResolvedQuestion } from "@/types/questions";

type NumericQuestion = Extract<ResolvedQuestion, { type: "numeric" }>;

type NumericCardProps = {
    question: NumericQuestion;
    /** Optional hint text shown above the question */
    contextHint?: string | null;
};

export function NumericCard({ question, contextHint }: NumericCardProps) {
    const { user } = useUser();

    const [inputValue, setInputValue] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const startTimeRef = useRef<number>(Date.now());

    // Check if this concept was previously struggled with
    const showRevisitHint =
        !contextHint && isStruggledConcept(question.conceptId);

    const handleSubmit = () => {
        if (isSubmitted) return;

        Keyboard.dismiss();

        const cleaned = inputValue.replace(/[$,\s]/g, "");
        const userAnswer = parseFloat(cleaned);

        if (isNaN(userAnswer)) return;

        const diff = Math.abs(userAnswer - question.correctAnswer);
        const correct = diff <= question.tolerance;
        const responseTimeMs = Date.now() - startTimeRef.current;

        setIsCorrect(correct);
        setIsSubmitted(true);

        // Report to learning profile (+ remote logging if configured)
        void recordAnswerAndSync(
            {
                questionId: question.id,
                conceptId: question.conceptId,
                difficulty: question.difficulty,
                correct,
                responseTimeMs,
                questionType: "numeric",
                source: "feed",
                timestamp: Date.now(),
            },
            user?.id,
        );

        // Flag for revisit if incorrect
        if (!correct) {
            flagConceptForRevisit(question.conceptId);
        }
    };

    /** Format a number for display (e.g. 12345.67 → $12,345.67) */
    const formatAnswer = (value: number): string => {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <View style={styles.container}>
            {(contextHint || showRevisitHint) && (
                <View style={styles.hintBadge}>
                    <ThemedText style={styles.hintText}>
                        {contextHint ?? "Revisiting a concept"}
                    </ThemedText>
                </View>
            )}

            <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>Calculate</ThemedText>
            </View>

            <ThemedText style={styles.questionText}>
                {question.questionText}
            </ThemedText>

            <View style={styles.inputContainer}>
                <View
                    style={[
                        styles.inputWrapper,
                        isSubmitted &&
                            (isCorrect
                                ? styles.inputCorrect
                                : styles.inputIncorrect),
                    ]}
                >
                    <ThemedText style={styles.dollarSign}>$</ThemedText>
                    <TextInput
                        style={styles.textInput}
                        value={inputValue}
                        onChangeText={setInputValue}
                        placeholder="Enter your answer"
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        keyboardType="numeric"
                        editable={!isSubmitted}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        isSubmitted ? styles.submitButtonDisabled : null,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitted || inputValue.trim() === ""}
                    activeOpacity={0.7}
                >
                    <ThemedText style={styles.submitButtonText}>
                        {isSubmitted ? "Submitted" : "Submit"}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {isSubmitted && (
                <View style={styles.feedbackContainer}>
                    <ThemedText
                        style={[
                            styles.feedbackText,
                            isCorrect
                                ? styles.feedbackCorrect
                                : styles.feedbackIncorrect,
                        ]}
                    >
                        {isCorrect
                            ? "✓ Correct!"
                            : `✗ Incorrect — the answer is ${formatAnswer(question.correctAnswer)}`}
                    </ThemedText>
                    <ThemedText style={styles.toleranceHint}>
                        (Accepted range: ±
                        {(
                            (question.tolerance / question.correctAnswer) *
                            100
                        ).toFixed(0)}
                        %)
                    </ThemedText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        rowGap: 20,
    },
    hintBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    hintText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fbbf24",
    },
    badge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(168, 85, 247, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#a855f7",
    },
    questionText: {
        fontSize: 22,
        fontWeight: "700",
        lineHeight: 30,
        color: "#fff",
    },
    inputContainer: {
        rowGap: 12,
        marginTop: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 56,
    },
    inputCorrect: {
        borderColor: "#22c55e",
        borderWidth: 1.5,
        backgroundColor: "rgba(34, 197, 94, 0.1)",
    },
    inputIncorrect: {
        borderColor: "#ef4444",
        borderWidth: 1.5,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
    dollarSign: {
        fontSize: 18,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 18,
        color: "#fff",
        height: "100%",
    },
    submitButton: {
        backgroundColor: "#0a7ea4",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
    },
    submitButtonDisabled: {
        backgroundColor: "rgba(10, 126, 164, 0.4)",
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    feedbackContainer: {
        rowGap: 4,
        paddingHorizontal: 4,
    },
    feedbackText: {
        fontSize: 16,
        fontWeight: "600",
    },
    feedbackCorrect: {
        color: "#22c55e",
    },
    feedbackIncorrect: {
        color: "#ef4444",
    },
    toleranceHint: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.4)",
    },
});
