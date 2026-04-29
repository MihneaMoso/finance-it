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
import { recordAnswerAndSync } from "@/services/LearningProfileService";
import { completeNode, getLessonById } from "@/services/LessonService";
import { recordStreakActivity } from "@/services/StreakService";
import { syncNextLessonWidget } from "@/services/WidgetSyncService";
import type {
    HeartsState,
    Lesson,
    LessonContentSlide,
    Question,
} from "@/types/questions";
import { useUser } from "@clerk/clerk-expo";

export default function LessonScreen() {
    const { user } = useUser();
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
                try {
                    await completeNode(lesson.id, user?.id ?? null);

                    // Keep widget state in sync with completion.
                    void syncNextLessonWidget(user?.id ?? null);
                } catch (err) {
                    // If persisting completion fails (AsyncStorage, etc.), still allow the user
                    // to exit the lesson. We don't want to trap them on the last question.
                    console.warn("Failed to persist lesson completion", err);
                }
            }

            // Completing a lesson counts as streak activity.
            try {
                if (user?.id) {
                    await recordStreakActivity({
                        userId: user.id,
                        type: "lesson",
                    });
                }
            } catch {
                // ignore
            }

            // Exit the lesson the same way as the back button.
            router.back();
        },
        [lesson, router, user?.id],
    );

    const onContinue = useCallback(async () => {
        if (!lesson) return;

        // Lesson is complete (or we somehow advanced past the end):
        // make Continue behave like the back button.
        if (stepIndex >= totalSteps) {
            router.back();
            return;
        }

        // Slide mode
        if (isSlide) {
            const isLastSlide = stepIndex + 1 >= slidesCount;
            if (isLastSlide && quizCount === 0) {
                await finishLesson(true, 100);
                return;
            }

            setStepIndex((i) => Math.min(i + 1, Math.max(totalSteps - 1, 0)));
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

            void recordAnswerAndSync(
                {
                    questionId: currentQ.id,
                    conceptId: currentQ.conceptId,
                    difficulty: currentQ.difficulty,
                    correct: isCorrect,
                    responseTimeMs: 0,
                    timestamp: Date.now(),
                    source: "lesson",
                    questionType: "mcq",
                },
                user?.id,
            );

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
        if (isLastQuestion) {
            const score =
                quizCount > 0 ? (correctCount / quizCount) * 100 : 100;
            await finishLesson(score >= 70, score);
            return;
        }

        setSubmitted(false);
        setSelectedIndex(null);

        setStepIndex((i) => i + 1);
    }, [
        correctCount,
        currentQ,
        finishLesson,
        isSlide,
        lesson,
        quizCount,
        quizIndex,
        router,
        selectedIndex,
        slidesCount,
        stepIndex,
        submitted,
        totalSteps,
        user?.id,
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
    const isFinalStep = totalSteps > 0 && stepIndex >= totalSteps - 1;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: t((s) => s.learn.lesson),
                    headerShown: true,
                    headerStyle: { backgroundColor: "#0f1115" },
                    headerRight: () => headerRight,
                }}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
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

                                const selectedBg = "rgba(37, 99, 235, 0.25)";
                                const selectedBorder =
                                    "rgba(37, 99, 235, 0.85)";

                                const bg = !showFeedback
                                    ? isPicked
                                        ? selectedBg
                                        : "rgba(255,255,255,0.10)"
                                    : isCorrect
                                      ? "rgba(34,197,94,0.22)"
                                      : isPicked
                                        ? "rgba(239,68,68,0.22)"
                                        : "rgba(255,255,255,0.06)";

                                const border = !showFeedback
                                    ? isPicked
                                        ? selectedBorder
                                        : "rgba(255,255,255,0.15)"
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

            <View
                style={[
                    styles.footer,
                    { paddingBottom: Math.max(16, insets.bottom + 16) },
                ]}
            >
                <Pressable
                    onPress={onContinue}
                    style={({ pressed }) => [
                        styles.cta,
                        pressed && { opacity: 0.75 },
                    ]}
                >
                    <ThemedText style={styles.ctaText}>
                        {submitted
                            ? isFinalStep
                                ? t((s) => s.learn.continue)
                                : t((s) => s.lesson.next)
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
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 24,
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
        alignItems: "flex-start",
    },
    optionText: {
        flex: 1,
        flexShrink: 1,
        flexWrap: "wrap",
        fontSize: 16,
        lineHeight: 22,
        color: "#fff",
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
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
