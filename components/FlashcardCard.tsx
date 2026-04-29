import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { flashcardResponseToAnswerEvent } from "@/services/FlashcardService";
import {
    isStruggledConcept,
    recordAnswerAndSync,
} from "@/services/LearningProfileService";
import { flagConceptForRevisit } from "@/services/QuestionService";
import type { Flashcard, FlashcardResponse } from "@/types/questions";
import { useUser } from "@clerk/clerk-expo";

type FlashcardCardProps = {
    flashcard: Flashcard;
    onNext: () => void;
};

export function FlashcardCard({ flashcard, onNext }: FlashcardCardProps) {
    const { t, i18n } = useTranslation();
    const { user } = useUser();

    const [isFlipped, setIsFlipped] = useState(false);
    const [hasResponded, setHasResponded] = useState(false);
    const flipAnim = useRef(new Animated.Value(0)).current;
    const startTimeRef = useRef<number>(Date.now());

    const struggled = isStruggledConcept(flashcard.conceptId);

    const handleFlip = () => {
        if (isFlipped) return;

        setIsFlipped(true);
        Animated.spring(flipAnim, {
            toValue: 1,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleResponse = (response: FlashcardResponse) => {
        if (hasResponded) return;

        setHasResponded(true);

        const timeSpentMs = Date.now() - startTimeRef.current;
        const event = flashcardResponseToAnswerEvent(
            flashcard,
            response,
            timeSpentMs,
        );

        void recordAnswerAndSync(event, user?.id);

        
        if (response === "didnt_know") {
            flagConceptForRevisit(flashcard.conceptId);
        }

        
        setTimeout(onNext, 400);
    };

    
    const frontOpacity = flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0, 0],
    });
    const backOpacity = flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    const difficultyColor =
        flashcard.difficulty === "easy"
            ? "#22c55e"
            : flashcard.difficulty === "medium"
              ? "#f59e0b"
              : "#ef4444";

    const lang = i18n.language || "en";
    const frontText = flashcard.front[lang] ?? flashcard.front.en ?? "";
    const backText = flashcard.back[lang] ?? flashcard.back.en ?? "";

    return (
        <View style={styles.container}>
            {struggled && (
                <View style={styles.hintBadge}>
                    <ThemedText style={styles.hintText}>
                        {t("flashcards.revisitingConcept")}
                    </ThemedText>
                </View>
            )}

            <View style={styles.difficultyRow}>
                <View
                    style={[
                        styles.difficultyBadge,
                        { backgroundColor: `${difficultyColor}20` },
                    ]}
                >
                    <ThemedText
                        style={[
                            styles.difficultyText,
                            { color: difficultyColor },
                        ]}
                    >
                        {flashcard.difficulty.charAt(0).toUpperCase() +
                            flashcard.difficulty.slice(1)}
                    </ThemedText>
                </View>
                <View style={styles.flashcardBadge}>
                    <ThemedText style={styles.flashcardBadgeText}>
                        Flashcard
                    </ThemedText>
                </View>
            </View>

            <TouchableWithoutFeedback onPress={handleFlip} disabled={isFlipped}>
                <View style={styles.cardWrapper}>
                    {/* Front */}
                    <Animated.View
                        style={[
                            styles.card,
                            styles.cardFront,
                            { opacity: frontOpacity },
                        ]}
                    >
                        <ThemedText style={styles.cardLabel}>
                            {t("flashcards.question")}
                        </ThemedText>
                        <ThemedText style={styles.cardText}>
                            {frontText}
                        </ThemedText>
                        <ThemedText style={styles.tapHint}>
                            {t("flashcards.tapToReveal")}
                        </ThemedText>
                    </Animated.View>

                    {/* Back */}
                    <Animated.View
                        style={[
                            styles.card,
                            styles.cardBack,
                            { opacity: backOpacity },
                        ]}
                    >
                        <ThemedText style={styles.cardLabel}>
                            {t("flashcards.answer")}
                        </ThemedText>
                        <ThemedText style={styles.cardText}>
                            {backText}
                        </ThemedText>
                    </Animated.View>
                </View>
            </TouchableWithoutFeedback>

            {isFlipped && !hasResponded && (
                <View style={styles.responseContainer}>
                    <ThemedText style={styles.responsePrompt}>
                        {t("flashcards.howWell")}
                    </ThemedText>
                    <View style={styles.responseButtons}>
                        <TouchableOpacity
                            style={[
                                styles.responseButton,
                                styles.responseDidntKnow,
                            ]}
                            onPress={() => handleResponse("didnt_know")}
                            activeOpacity={0.7}
                        >
                            <ThemedText style={styles.responseEmoji}>
                                😕
                            </ThemedText>
                            <ThemedText style={styles.responseLabel}>
                                {t("flashcards.didntKnow")}
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.responseButton,
                                styles.responseUnsure,
                            ]}
                            onPress={() => handleResponse("unsure")}
                            activeOpacity={0.7}
                        >
                            <ThemedText style={styles.responseEmoji}>
                                🤔
                            </ThemedText>
                            <ThemedText style={styles.responseLabel}>
                                {t("flashcards.unsure")}
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.responseButton, styles.responseKnew]}
                            onPress={() => handleResponse("knew_it")}
                            activeOpacity={0.7}
                        >
                            <ThemedText style={styles.responseEmoji}>
                                😊
                            </ThemedText>
                            <ThemedText style={styles.responseLabel}>
                                {t("flashcards.knewIt")}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {hasResponded && (
                <View style={styles.respondedContainer}>
                    <ThemedText style={styles.respondedText}>
                        {t("flashcards.responseRecorded")}
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
    difficultyRow: {
        flexDirection: "row",
        columnGap: 8,
    },
    difficultyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    difficultyText: {
        fontSize: 13,
        fontWeight: "600",
    },
    flashcardBadge: {
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    flashcardBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#8b5cf6",
    },
    cardWrapper: {
        minHeight: 240,
        position: "relative",
    },
    card: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        minHeight: 240,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 28,
        justifyContent: "center",
        rowGap: 16,
    },
    cardFront: {
        backgroundColor: "rgba(255, 255, 255, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
    },
    cardBack: {
        backgroundColor: "rgba(139, 92, 246, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(139, 92, 246, 0.3)",
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    cardText: {
        fontSize: 20,
        fontWeight: "600",
        lineHeight: 28,
        color: "#fff",
    },
    tapHint: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.35)",
        textAlign: "center",
        marginTop: 8,
    },
    responseContainer: {
        rowGap: 12,
    },
    responsePrompt: {
        fontSize: 16,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.7)",
        textAlign: "center",
    },
    responseButtons: {
        flexDirection: "row",
        columnGap: 10,
    },
    responseButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        rowGap: 4,
    },
    responseDidntKnow: {
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
    },
    responseUnsure: {
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.3)",
    },
    responseKnew: {
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(34, 197, 94, 0.3)",
    },
    responseEmoji: {
        fontSize: 24,
    },
    responseLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.8)",
    },
    respondedContainer: {
        alignItems: "center",
        paddingVertical: 12,
    },
    respondedText: {
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
    },
});
