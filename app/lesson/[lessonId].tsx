import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeartsIndicator } from "@/components/HeartsIndicator";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/i18n/strings";
import {
    canContinue,
    consumeHeart,
    getHeartsState,
} from "@/services/HeartsService";
import { recordAnswer } from "@/services/LearningProfileService";
import { completeNode, getLessonById } from "@/services/LessonService";
import type {
    HeartsState,
    Lesson,
    LessonContentSlide,
    Question,
} from "@/types/questions";

export default function LessonScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { lessonId } = useLocalSearchParams<{ lessonId: string }>();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [hearts, setHearts] = useState<HeartsState | null>(null);

    const [stepIndex, setStepIndex] = useState(0);

    // quiz state
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);

    useEffect(() => {
        void (async () => {
            setHearts(await getHeartsState());
            if (lessonId) {
                setLesson(await getLessonById(String(lessonId)));
            }
        })();
    }, [lessonId]);

    const slides: LessonContentSlide[] = useMemo(
        () => lesson?.slides ?? [],
        [lesson],
    );
    const questions: Question[] = useMemo(
        () => lesson?.questions ?? [],
        [lesson],
    );

    const slidesCount = slides.length;
    const quizCount = questions.length;
    const totalSteps = slidesCount + quizCount;

    const isSlide = stepIndex < slidesCount;
    const quizIndex = stepIndex - slidesCount;

    const currentSlide = isSlide ? slides[stepIndex] : null;
    const currentQ = !isSlide ? questions[quizIndex] : null;

    const headerRight = useMemo(() => {
        return hearts ? (
            <HeartsIndicator current={hearts.current} max={hearts.max} />
        ) : null;
    }, [hearts]);

    const finishLesson = useCallback(
        async (passed: boolean, score: number) => {
            if (!lesson) return;
            if (passed) {
                await completeNode(lesson.id);
            }

            Alert.alert(
                `${t((s) => s.lesson.score)}: ${Math.round(score)}%`,
                passed ? t((s) => s.lesson.pass) : t((s) => s.lesson.fail),
                [{ text: t((s) => s.common.ok), onPress: () => router.back() }],
            );
        },
        [lesson, router],
    );

    const onContinue = useCallback(async () => {
        if (!lesson) return;

        // Slide mode
        if (isSlide) {
            setStepIndex((i) => Math.min(i + 1, totalSteps));
            return;
        }

        // Quiz mode
        if (!currentQ) {
            const score =
                quizCount > 0 ? (correctCount / quizCount) * 100 : 100;
            await finishLesson(score >= 70, score);
            return;
        }

        if (currentQ.type !== "mcq") {
            Alert.alert(t((s) => s.common.notFound));
            return;
        }

        if (selectedIndex === null) {
            Alert.alert(t((s) => s.common.selectAnAnswer));
            return;
        }

        // First tap: submit and show feedback
        if (!submitted) {
            const isCorrect = selectedIndex === currentQ.correctIndex;

            recordAnswer({
                conceptId: currentQ.conceptId,
                difficulty: currentQ.difficulty,
                correct: isCorrect,
                responseTimeMs: 0,
                timestamp: Date.now(),
                source: "lesson",
            });

            if (!isCorrect) {
                const allow = await canContinue();
                if (!allow) {
                    Alert.alert(
                        t((s) => s.hearts.blockedTitle),
                        t((s) => s.hearts.blockedBody),
                    );
                    return;
                }
                await consumeHeart();
                setHearts(await getHeartsState());
            } else {
                setCorrectCount((c) => c + 1);
            }

            setSubmitted(true);
            return;
        }

        // Second tap: advance
        const isLastQuestion = quizIndex + 1 >= quizCount;

        setSubmitted(false);
        setSelectedIndex(null);
        setStepIndex((i) => i + 1);

        if (isLastQuestion) {
            const score =
                quizCount > 0 ? (correctCount / quizCount) * 100 : 100;
            await finishLesson(score >= 70, score);
        }
    }, [
        correctCount,
        currentQ,
        finishLesson,
        isSlide,
        lesson,
        quizCount,
        quizIndex,
        questions,
        selectedIndex,
        submitted,
        totalSteps,
    ]);

    if (!lesson) {
        return (
            <View
                style={[
                    styles.screen,
                    { paddingTop: insets.top, paddingHorizontal: 16 },
                ]}
            >
                <StatusBar style="light" />
                <ThemedText style={{ color: "#fff" }}>
                    {t((s) => s.common.notFound)}
                </ThemedText>
            </View>
        );
    }

    const progressLabel = `${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: t((s) => s.learn.lesson),
                    headerShown: true,
                    headerStyle: { backgroundColor: "#0f1115" },
                    headerTintColor: "#fff",
                    headerRight: () => headerRight,
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <ThemedText style={styles.small}>{progressLabel}</ThemedText>

                {isSlide && currentSlide && (
                    <View style={styles.card}>
                        <ThemedText style={styles.title}>
                            {currentSlide.title.en}
                        </ThemedText>
                        <ThemedText style={styles.body}>
                            {currentSlide.content.en}
                        </ThemedText>
                    </View>
                )}

                {!isSlide && currentQ?.type === "mcq" && (
                    <View style={styles.card}>
                        <ThemedText style={styles.title}>
                            {currentQ.question}
                        </ThemedText>

                        <View style={styles.options}>
                            {currentQ.options.map((opt, idx) => {
                                const isCorrect = idx === currentQ.correctIndex;
                                const isPicked = idx === selectedIndex;
                                const showFeedback = submitted;

                                const bg = !showFeedback
                                    ? "rgba(255,255,255,0.10)"
                                    : isCorrect
                                      ? "rgba(34,197,94,0.22)"
                                      : isPicked
                                        ? "rgba(239,68,68,0.22)"
                                        : "rgba(255,255,255,0.06)";

                                const border = !showFeedback
                                    ? "rgba(255,255,255,0.15)"
                                    : isCorrect
                                      ? "#22c55e"
                                      : isPicked
                                        ? "#ef4444"
                                        : "rgba(255,255,255,0.08)";

                                return (
                                    <Pressable
                                        key={idx}
                                        onPress={() => {
                                            if (submitted) return;
                                            setSelectedIndex(idx);
                                        }}
                                        style={({ pressed }) => [
                                            styles.option,
                                            {
                                                backgroundColor: bg,
                                                borderColor: border,
                                            },
                                            pressed &&
                                                !submitted && { opacity: 0.85 },
                                        ]}
                                    >
                                        <ThemedText style={styles.optionText}>
                                            {opt}
                                        </ThemedText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    onPress={onContinue}
                    style={({ pressed }) => [
                        styles.cta,
                        pressed && { opacity: 0.75 },
                    ]}
                >
                    <ThemedText style={styles.ctaText}>
                        {submitted
                            ? t((s) => s.lesson.next)
                            : t((s) => s.learn.continue)}
                    </ThemedText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0f1115",
    },
    content: {
        flexGrow: 1,
        paddingBottom: 80,
    },
    small: {
        marginBottom: 8,
        textAlign: "center",
        color: "#9ca3af",
    },
    card: {
        backgroundColor: "#111827",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        overflow: "hidden",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        color: "#fff",
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        color: "#d1d5db",
    },
    options: {
        marginTop: 12,
    },
    option: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    optionText: {
        fontSize: 16,
        color: "#fff",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    cta: {
        backgroundColor: "#22c55e",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    ctaText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
    },
});
