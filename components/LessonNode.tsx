/**
 * LessonNode — roadmap node tile (lesson or simulation) with status styling.
 */

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { LessonNode as LessonNodeType } from "@/types/questions";
import { useTranslation } from "react-i18next";

export function LessonNode({
    node,
    onPress,
}: {
    node: LessonNodeType;
    onPress: (node: LessonNodeType) => void;
}) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language?.toLowerCase().startsWith("ro") ? "ro" : "en";
    const title = (node.title as any)[lang] ?? node.title.en;

    const disabled = node.status === "locked";

    const badgeText =
        node.type === "lesson"
            ? t("learn.lesson")
            : node.type === "chapter_test"
              ? t("learn.chapterTest")
              : t("learn.practice");

    return (
        <TouchableOpacity
            onPress={() => onPress(node)}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                styles.container,
                node.status === "completed" && styles.completed,
                node.status === "available" && styles.available,
                node.status === "locked" && styles.locked,
            ]}
        >
            <View style={styles.row}>
                <View
                    style={[
                        styles.badge,
                        node.type === "lesson"
                            ? styles.badgeLesson
                            : styles.badgeSim,
                    ]}
                >
                    <ThemedText style={styles.badgeText}>
                        {badgeText}
                    </ThemedText>
                </View>
                <View style={styles.statusDot} />
            </View>

            <ThemedText
                style={styles.title}
                numberOfLines={2}
                ellipsizeMode="tail"
            >
                {title}
            </ThemedText>

            <ThemedText
                style={styles.meta}
                numberOfLines={2}
                ellipsizeMode="tail"
            >
                {node.difficulty.toUpperCase()} • {node.conceptIds.join(", ")}
            </ThemedText>

            {node.status === "locked" && (
                <ThemedText style={styles.lockedText}>
                    {t("learn.locked")}
                </ThemedText>
            )}
            {node.status === "completed" && (
                <ThemedText style={styles.completedText}>
                    {t("learn.completed")}
                </ThemedText>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 168,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 18,
        borderWidth: 1,
        rowGap: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeLesson: {
        backgroundColor: "rgba(34, 197, 94, 0.15)",
    },
    badgeSim: {
        backgroundColor: "rgba(139, 92, 246, 0.15)",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.75)",
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    title: {
        fontSize: 15,
        fontWeight: "800",
        color: "#fff",
        lineHeight: 20,
    },
    meta: {
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.45)",
        lineHeight: 16,
    },
    lockedText: {
        fontSize: 12,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.4)",
    },
    completedText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#22c55e",
    },
    available: {
        borderColor: "rgba(255, 255, 255, 0.15)",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    locked: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        opacity: 0.7,
    },
    completed: {
        borderColor: "rgba(34, 197, 94, 0.35)",
        backgroundColor: "rgba(34, 197, 94, 0.10)",
    },
});
