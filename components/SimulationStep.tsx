/**
 * SimulationStepView — renders a story or question step.
 *
 * For question steps, it reuses QuestionCard-display patterns but adapts
 * to a contained layout and returns correct/incorrect to the parent engine.
 */

import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { getLanguage, t } from "@/i18n/strings";
import type { SimulationStep } from "@/types/questions";

export function SimulationStepView({
    step,
    onAnswered,
}: {
    step: SimulationStep;
    onAnswered: (result: { correct: boolean; responseTimeMs: number }) => void;
}) {
    const lang = getLanguage();
    const content = step.content[lang] ?? step.content.en;

    const startTimeRef = useRef(Date.now());
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const q = step.question;

    const isQuestion = step.type === "question" && q;

    const mcq = useMemo(() => (q?.type === "mcq" ? q : null), [q]);

    const handleMCQ = (idx: number) => {
        if (!mcq || submitted) return;

        const correct = idx === mcq.correctIndex;
        setSelectedIndex(idx);
        setSubmitted(true);

        onAnswered({
            correct,
            responseTimeMs: Date.now() - startTimeRef.current,
        });
    };

    return (
        <View style={styles.container}>
            <ThemedText style={styles.storyText}>{content}</ThemedText>

            {isQuestion && mcq && (
                <View style={styles.options}>
                    {mcq.options.map((opt, idx) => {
                        const isAnswered = submitted;
                        const isCorrect = idx === mcq.correctIndex;
                        const isPicked = idx === selectedIndex;

                        const bg = !isAnswered
                            ? "rgba(255,255,255,0.10)"
                            : isCorrect
                              ? "rgba(34,197,94,0.22)"
                              : isPicked
                                ? "rgba(239,68,68,0.22)"
                                : "rgba(255,255,255,0.06)";

                        const border = !isAnswered
                            ? "rgba(255,255,255,0.15)"
                            : isCorrect
                              ? "#22c55e"
                              : isPicked
                                ? "#ef4444"
                                : "rgba(255,255,255,0.08)";

                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => handleMCQ(idx)}
                                disabled={submitted}
                                activeOpacity={0.7}
                                style={[
                                    styles.option,
                                    {
                                        backgroundColor: bg,
                                        borderColor: border,
                                    },
                                ]}
                            >
                                <ThemedText style={styles.optionText}>
                                    {opt}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {isQuestion && q?.type === "numeric" && (
                <ThemedText style={styles.note}>
                    {t((s) => s.common.notFound)}
                </ThemedText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        rowGap: 14,
    },
    storyText: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.9)",
    },
    options: {
        rowGap: 10,
        marginTop: 6,
    },
    option: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    optionText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#fff",
    },
    note: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.5)",
    },
});
