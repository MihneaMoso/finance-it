
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuestionCard } from "@/components/QuestionCard";
import { StreakBadge } from "@/components/StreakBadge";
import {
    getQuestionBatchLocalized,
    localizeResolvedQuestion,
    setActiveUserIdForRecommendations,
} from "@/services/QuestionService";
import { getStreak, subscribeToStreak } from "@/services/StreakService";
import type { ResolvedQuestion } from "@/types/questions";
import { useUser } from "@clerk/clerk-expo";

/** Number of questions to load per batch */
const BATCH_SIZE = 10;

export default function HomeScreen() {
    const { user } = useUser();
    const { i18n } = useTranslation();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // Account for safe area top + bottom tab bar (~49px) + safe area bottom
    const TAB_BAR_HEIGHT = 49;
    const itemHeight = windowHeight - insets.bottom - TAB_BAR_HEIGHT;

    const [questions, setQuestions] = useState<ResolvedQuestion[]>(() =>
        getQuestionBatchLocalized(BATCH_SIZE, i18n.language),
    );
    const [streak, setStreak] = useState<Awaited<
        ReturnType<typeof getStreak>
    > | null>(null);
    const isLoadingMore = useRef(false);

    React.useEffect(() => {
        setActiveUserIdForRecommendations(user?.id ?? null);
    }, [user?.id]);

    React.useEffect(() => {
        setQuestions((prev) =>
            prev.map((q) => localizeResolvedQuestion(q, i18n.language)),
        );
    }, [i18n.language]);

    React.useEffect(() => {
        let cancelled = false;
        if (!user?.id) {
            setStreak(null);
            return;
        }

        void (async () => {
            const s = await getStreak(user.id);
            if (!cancelled) setStreak(s);
        })();

        const unsub = subscribeToStreak((next) => {
            if (!cancelled) setStreak(next);
        });

        return () => {
            cancelled = true;
            unsub();
        };
    }, [user?.id]);

    /**
     * Load more questions when the user scrolls near the end.
     * Uses a ref flag to prevent concurrent loads.
     */
    const handleEndReached = useCallback(() => {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;

        const newBatch = getQuestionBatchLocalized(BATCH_SIZE, i18n.language);
        setQuestions((prev) => [...prev, ...newBatch]);
        isLoadingMore.current = false;
    }, [i18n.language]);

    /** Render a single question card at full viewport height */
    const renderItem = useCallback(
        ({ item }: { item: ResolvedQuestion }) => (
            <View style={[styles.cardContainer, { height: itemHeight }]}>
                <QuestionCard question={item} />
            </View>
        ),
        [itemHeight],
    );

    /** Stable key extractor using question ID + index for generated questions */
    const keyExtractor = useCallback(
        (item: ResolvedQuestion, index: number) => `${item.id}-${index}`,
        [],
    );

    /** Optimize FlatList layout calculation since all items are the same height */
    const getItemLayout = useCallback(
        (_data: unknown, index: number) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
        }),
        [itemHeight],
    );

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            {streak && (
                <StreakBadge
                    compact
                    streak={streak}
                    style={[styles.streak, { top: insets.top + 10, right: 14 }]}
                />
            )}
            <FlatList
                data={questions}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                // Snap paging behavior (TikTok-style)
                pagingEnabled
                snapToInterval={itemHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                // Performance optimizations
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                maxToRenderPerBatch={3}
                windowSize={5}
                initialNumToRender={2}
                // Infinite scroll: load more when 70% scrolled
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.3}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0f1115",
    },
    streak: {
        position: "absolute",
        zIndex: 10,
    },
    cardContainer: {
        width: "100%",
        justifyContent: "center",
        paddingTop: 20,
        paddingBottom: 20,
    },
});
