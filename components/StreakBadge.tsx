import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { Streak } from "@/services/MLService";

type Props = {
    streak: Streak;
    style?: ViewStyle;
    compact?: boolean;
};

export function StreakBadge({ streak, style, compact }: Props) {
    const scale = useRef(new Animated.Value(1)).current;
    const prevCurrentRef = useRef<number>(streak.current);

    const current = streak.current;

    const label = useMemo(() => {
        const n = Math.max(0, Math.floor(current));
        return compact ? `🔥 ${n}` : `🔥 ${n} day streak`;
    }, [compact, current]);

    useEffect(() => {
        const prev = prevCurrentRef.current;
        const next = current;
        prevCurrentRef.current = next;

        if (next > prev) {
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.08,
                    duration: 140,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 160,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [current, scale]);

    return (
        <Animated.View
            style={[styles.badge, style, { transform: [{ scale }] }]}
        >
            <View style={styles.inner}>
                <ThemedText style={styles.text}>{label}</ThemedText>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: "flex-start",
    },
    inner: {
        backgroundColor: "rgba(255, 255, 255, 0.10)",
        borderColor: "rgba(255, 255, 255, 0.14)",
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    text: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
});
