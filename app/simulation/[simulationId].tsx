import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeartsIndicator } from "@/components/HeartsIndicator";
import { SimulationStepView } from "@/components/SimulationStep";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/i18n/strings";
import {
    canContinue,
    consumeHeart,
    getHeartsState,
} from "@/services/HeartsService";
import { recordAnswerAndSync } from "@/services/LearningProfileService";
import { getSimulationById } from "@/services/SimulationService";
import type {
    HeartsState,
    Simulation,
    SimulationStep,
} from "@/types/questions";
import { useUser } from "@clerk/clerk-expo";

export default function SimulationScreen() {
    const { user } = useUser();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { simulationId } = useLocalSearchParams<{ simulationId: string }>();

    const [sim, setSim] = useState<Simulation | null>(null);
    const [hearts, setHearts] = useState<HeartsState | null>(null);

    const [stepIndex, setStepIndex] = useState(0);
    const [stepAnswered, setStepAnswered] = useState(false);

    useEffect(() => {
        void (async () => {
            setHearts(await getHeartsState());
            if (simulationId) {
                setSim(await getSimulationById(String(simulationId)));
            }
        })();
    }, [simulationId]);

    const steps: SimulationStep[] = useMemo(() => sim?.steps ?? [], [sim]);
    const step = steps[stepIndex];

    const headerRight = useMemo(() => {
        return hearts ? (
            <HeartsIndicator current={hearts.current} max={hearts.max} />
        ) : null;
    }, [hearts]);

    const onAnswered = useCallback(
        async (result: { correct: boolean; responseTimeMs: number }) => {
            if (!sim || !step || step.type !== "question" || !step.question)
                return;

            // Simulation mistakes should be higher-weight signals in the future.
            // For now they feed into the same learning profile pipeline.
            void recordAnswerAndSync(
                {
                    questionId: step.question.id,
                    conceptId: step.question.conceptId,
                    difficulty: step.question.difficulty,
                    correct: result.correct,
                    responseTimeMs: result.responseTimeMs,
                    timestamp: Date.now(),
                    source: "simulation",
                    questionType: step.question.type,
                },
                user?.id,
            );

            if (!result.correct) {
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
            }

            setStepAnswered(true);
        },
        [sim, step, user?.id],
    );

    const onContinue = useCallback(() => {
        if (!steps.length) return;

        const isLast = stepIndex >= steps.length - 1;
        if (isLast) {
            Alert.alert(t((s) => s.learn.completed));
            router.back();
            return;
        }

        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
        setStepAnswered(false);
    }, [router, stepIndex, steps.length]);

    if (!sim || !step) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style="light" />
                <ThemedText style={{ color: "#fff" }}>
                    {t((s) => s.learn.locked)}
                </ThemedText>
            </View>
        );
    }

    const canAdvance = step.type === "story" || stepAnswered;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: t((s) => s.simulation.scenario),
                    headerShown: true,
                    headerStyle: { backgroundColor: "#0f1115" },
                    headerTintColor: "#fff",
                    headerRight: () => headerRight,
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <SimulationStepView step={step} onAnswered={onAnswered} />
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    onPress={onContinue}
                    disabled={!canAdvance}
                    style={({ pressed }) => [
                        styles.cta,
                        (!canAdvance || pressed) && { opacity: 0.7 },
                    ]}
                >
                    <ThemedText style={styles.ctaText}>
                        {t((s) => s.simulation.continue)}
                    </ThemedText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#0f1115" },
    content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
    },
    cta: {
        height: 54,
        borderRadius: 16,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
    },
    ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
