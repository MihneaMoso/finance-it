import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeartsIndicator } from "@/components/HeartsIndicator";
import { LessonNode } from "@/components/LessonNode";
import { RoadmapPath } from "@/components/RoadmapPath";
import { ThemedText } from "@/components/themed-text";
import { getLanguage, t } from "@/i18n/strings";
import { getHeartsState } from "@/services/HeartsService";
import { CHAPTERS, getRoadmapNodes } from "@/services/LessonService";
import type {
    HeartsState,
    LessonNode as LessonNodeType,
} from "@/types/questions";

export default function LearnScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();

    const [nodes, setNodes] = useState<LessonNodeType[]>([]);
    const [hearts, setHearts] = useState<HeartsState | null>(null);

    const load = useCallback(async () => {
        const [ns, hs] = await Promise.all([
            getRoadmapNodes(),
            getHeartsState(),
        ]);
        setNodes(ns);
        setHearts(hs);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const handlePress = useCallback(
        (node: LessonNodeType) => {
            if (node.status === "locked") return;

            if (node.type === "lesson") {
                router.push(`/lesson/${node.id}` as unknown as any);
            } else {
                // simulations + chapter tests both run in the simulation engine for now
                router.push(`/simulation/${node.id}` as unknown as any);
            }
        },
        [router],
    );

    const lang = getLanguage();

    const sortedNodes = useMemo(() => {
        return [...nodes].sort((a, b) => a.order - b.order);
    }, [nodes]);

    const MAP_WIDTH = Math.min(windowWidth, 520);
    const MAP_PADDING_TOP = 70;
    const MAP_PADDING_BOTTOM = 140;

    const pointFor = useCallback(
        (n: LessonNodeType) => {
            const xNorm = n.ui?.x ?? 0.5;
            const yNorm = n.ui?.y ?? 0;
            return {
                x: xNorm * MAP_WIDTH,
                y: MAP_PADDING_TOP + yNorm * 1000,
            };
        },
        [MAP_PADDING_TOP, MAP_WIDTH],
    );

    const mapHeight = useMemo(() => {
        const ys = sortedNodes.map((n) => pointFor(n).y);
        const maxY = ys.length ? Math.max(...ys) : 800;
        return Math.max(900, maxY + MAP_PADDING_BOTTOM);
    }, [MAP_PADDING_BOTTOM, pointFor, sortedNodes]);

    const paths = useMemo(() => {
        const out: {
            from: { x: number; y: number };
            to: { x: number; y: number };
        }[] = [];
        for (let i = 1; i < sortedNodes.length; i++) {
            out.push({
                from: pointFor(sortedNodes[i - 1]),
                to: pointFor(sortedNodes[i]),
            });
        }
        return out;
    }, [pointFor, sortedNodes]);

    const chapterTitleById = useMemo(() => {
        const map = new Map<string, string>();
        for (const ch of CHAPTERS) {
            map.set(ch.id, ch.title[lang] ?? ch.title.en);
        }
        return map;
    }, [lang]);

    const chapterMarkers = useMemo(() => {
        const markers: { chapterId: string; y: number }[] = [];
        const seen = new Set<string>();
        for (const n of sortedNodes) {
            if (seen.has(n.chapterId)) continue;
            seen.add(n.chapterId);
            markers.push({ chapterId: n.chapterId, y: pointFor(n).y - 40 });
        }
        return markers;
    }, [pointFor, sortedNodes]);

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            <View style={styles.topBar}>
                <View style={{ flex: 1 }} />
                {hearts && (
                    <HeartsIndicator
                        current={hearts.current}
                        max={hearts.max}
                    />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={[
                        styles.map,
                        { width: MAP_WIDTH, height: mapHeight },
                    ]}
                >
                    {/* Chapter headers */}
                    {chapterMarkers.map((m) => (
                        <View
                            key={m.chapterId}
                            style={[
                                styles.chapterHeader,
                                { top: Math.max(8, m.y) },
                            ]}
                        >
                            <View style={styles.chapterPill}>
                                <ThemedText style={styles.chapterPillText}>
                                    {t((s) => s.learn.chapter)}{" "}
                                    {chapterTitleById.get(m.chapterId) ?? ""}
                                </ThemedText>
                            </View>
                        </View>
                    ))}

                    {paths.map((p, idx) => (
                        <RoadmapPath key={idx} from={p.from} to={p.to} />
                    ))}

                    {sortedNodes.map((n) => {
                        const pt = pointFor(n);
                        return (
                            <View
                                key={n.id}
                                style={[
                                    styles.nodeSlot,
                                    {
                                        left: pt.x,
                                        top: pt.y,
                                    },
                                ]}
                            >
                                <LessonNode node={n} onPress={handlePress} />
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0f1115",
    },
    topBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 6,
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        alignItems: "center",
    },
    map: {
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    nodeSlot: {
        position: "absolute",
        transform: [{ translateX: -84 }, { translateY: -52 }],
    },
    chapterHeader: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingHorizontal: 14,
    },
    chapterPill: {
        alignSelf: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
    },
    chapterPillText: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
    chapterTitleWrap: {
        marginTop: 6,
        alignItems: "center",
    },
    chapterTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(59,130,246,0.12)",
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.20)",
    },
});
