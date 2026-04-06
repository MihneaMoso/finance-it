/**
 * HeartsIndicator — lightweight display for the global hearts system.
 *
 * UI:
 * - Shows current/max hearts
 * - Animates on heart loss
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export function HeartsIndicator({
    current,
    max,
}: {
    current: number;
    max: number;
}) {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(pulse, {
                toValue: 1.1,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(pulse, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
    }, [current, pulse]);

    return (
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={styles.container}>
                <ThemedText style={styles.heart}>♥</ThemedText>
                <ThemedText style={styles.text}>
                    {current}/{max}
                </ThemedText>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.25)",
        columnGap: 6,
    },
    heart: {
        color: "#ef4444",
        fontSize: 14,
        fontWeight: "800",
    },
    text: {
        color: "rgba(255, 255, 255, 0.85)",
        fontSize: 13,
        fontWeight: "700",
    },
});
