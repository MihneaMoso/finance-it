/**
 * Home Feed Screen — Core of the Finance-IT MVP.
 *
 * Features:
 * - TikTok-style full-screen vertical scrolling with snap-to-item paging
 * - Each item is a finance question card (MCQ or numeric)
 * - Questions loaded from QuestionService
 * - Infinite-feel feed: loads more questions when user approaches the end
 * - 60fps smooth scrolling, no visible scrollbars
 *
 * Feed paging logic:
 * - Initial batch of 10 questions is loaded on mount
 * - When the user scrolls past 70% of loaded questions, another batch is appended
 * - This creates an "infinite scroll" effect without a real backend
 *
 * Future extension point: Replace getQuestionBatch() calls with
 * API requests to a real backend service.
 */

import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuestionCard } from "@/components/QuestionCard";
import { getQuestionBatch } from "@/services/QuestionService";
import type { ResolvedQuestion } from "@/types/questions";

/** Number of questions to load per batch */
const BATCH_SIZE = 10;

export default function HomeScreen() {
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // Account for safe area top + bottom tab bar (~49px) + safe area bottom
    const TAB_BAR_HEIGHT = 49;
    const itemHeight = windowHeight - insets.bottom - TAB_BAR_HEIGHT;

    const [questions, setQuestions] = useState<ResolvedQuestion[]>(() =>
        getQuestionBatch(BATCH_SIZE),
    );
    const isLoadingMore = useRef(false);

    /**
     * Load more questions when the user scrolls near the end.
     * Uses a ref flag to prevent concurrent loads.
     */
    const handleEndReached = useCallback(() => {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;

        const newBatch = getQuestionBatch(BATCH_SIZE);
        setQuestions((prev) => [...prev, ...newBatch]);
        isLoadingMore.current = false;
    }, []);

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
    cardContainer: {
        width: "100%",
        justifyContent: "center",
        paddingTop: 20,
        paddingBottom: 20,
    },
});
