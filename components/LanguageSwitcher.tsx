import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { setAppLanguage } from "@/i18n/i18n";

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const current = i18n.language === "ro" ? "ro" : "en";

    return (
        <View style={styles.row}>
            <Pressable
                onPress={() => setAppLanguage("en")}
                style={[styles.pill, current === "en" && styles.active]}
            >
                <ThemedText style={styles.text}>EN</ThemedText>
            </Pressable>
            <Pressable
                onPress={() => setAppLanguage("ro")}
                style={[styles.pill, current === "ro" && styles.active]}
            >
                <ThemedText style={styles.text}>RO</ThemedText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", columnGap: 10 },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    active: {
        borderColor: "rgba(34,197,94,0.45)",
        backgroundColor: "rgba(34,197,94,0.14)",
    },
    text: { color: "#fff", fontWeight: "800" },
});
