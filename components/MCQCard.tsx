/**
 * MCQCard — Renders a multiple-choice finance question.
 *
 * Features:
 * - Displays question text and 4 option buttons
 * - Immediate visual feedback (green = correct, red = incorrect)
 * - Disables all options after first selection
 * - Large touch targets for mobile UX
 */

import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { MCQQuestion } from "@/types/questions";

type MCQCardProps = {
    question: MCQQuestion;
};

export function MCQCard({ question }: MCQCardProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const isAnswered = selectedIndex !== null;
    const isCorrect = selectedIndex === question.correctIndex;

    const handleSelect = (index: number) => {
        // Disable re-answering after first selection
        if (isAnswered) return;
        setSelectedIndex(index);
    };

    /** Determine background color for each option button */
    const getOptionStyle = (index: number) => {
        if (!isAnswered) return styles.optionDefault;

        if (index === question.correctIndex) {
            return styles.optionCorrect; // Always highlight correct answer
        }
        if (index === selectedIndex && !isCorrect) {
            return styles.optionIncorrect; // Highlight wrong selection in red
        }
        return styles.optionDisabled;
    };

    const getOptionTextStyle = (index: number) => {
        if (!isAnswered) return styles.optionTextDefault;

        if (index === question.correctIndex)
            return styles.optionTextHighlighted;
        if (index === selectedIndex && !isCorrect)
            return styles.optionTextHighlighted;
        return styles.optionTextDisabled;
    };

    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                    Multiple Choice
                </ThemedText>
            </View>

            <ThemedText style={styles.questionText}>
                {question.question}
            </ThemedText>

            <View style={styles.optionsContainer}>
                {question.options.map((option, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.optionButton, getOptionStyle(index)]}
                        onPress={() => handleSelect(index)}
                        activeOpacity={isAnswered ? 1 : 0.7}
                        disabled={isAnswered}
                    >
                        <ThemedText
                            style={[
                                styles.optionLabel,
                                isAnswered ? styles.optionLabelAnswered : null,
                            ]}
                        >
                            {String.fromCharCode(65 + index)}
                        </ThemedText>
                        <ThemedText
                            style={[
                                styles.optionText,
                                getOptionTextStyle(index),
                            ]}
                            numberOfLines={3}
                        >
                            {option}
                        </ThemedText>
                    </TouchableOpacity>
                ))}
            </View>

            {isAnswered && (
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
                            : `✗ Incorrect — the answer is "${question.options[question.correctIndex]}"`}
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
    badge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(10, 126, 164, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0a7ea4",
    },
    questionText: {
        fontSize: 22,
        fontWeight: "700",
        lineHeight: 30,
        color: "#fff",
    },
    optionsContainer: {
        rowGap: 12,
        marginTop: 8,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        minHeight: 56,
    },
    optionDefault: {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    optionCorrect: {
        backgroundColor: "rgba(34, 197, 94, 0.25)",
        borderWidth: 1.5,
        borderColor: "#22c55e",
    },
    optionIncorrect: {
        backgroundColor: "rgba(239, 68, 68, 0.25)",
        borderWidth: 1.5,
        borderColor: "#ef4444",
    },
    optionDisabled: {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.6)",
        marginRight: 12,
        width: 20,
    },
    optionLabelAnswered: {
        color: "rgba(255, 255, 255, 0.4)",
    },
    optionText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 22,
    },
    optionTextDefault: {
        color: "#fff",
    },
    optionTextHighlighted: {
        color: "#fff",
        fontWeight: "600",
    },
    optionTextDisabled: {
        color: "rgba(255, 255, 255, 0.4)",
    },
    feedbackContainer: {
        marginTop: 4,
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
});
