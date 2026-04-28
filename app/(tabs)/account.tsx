import { SignOutButton } from "@/components/sign-out-button";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemedText } from "@/components/themed-text";
import { getStreak, subscribeToStreak } from "@/services/StreakService";
import type { UserProfile } from "@/types/questions";
import { useTranslation } from "react-i18next";

const EXPERIENCE_LEVELS: UserProfile["experienceLevel"][] = [
    "beginner",
    "intermediate",
    "advanced",
];

export default function AccountScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const router = useRouter();
    const { t } = useTranslation();

    const [streak, setStreak] = React.useState<Awaited<
        ReturnType<typeof getStreak>
    > | null>(null);

    const [experienceLevel, setExperienceLevel] =
        useState<UserProfile["experienceLevel"]>("beginner");
    const [isEditing, setIsEditing] = useState(false);
    const [editLevel, setEditLevel] =
        useState<UserProfile["experienceLevel"]>("beginner");

    const handleSave = () => {
        setExperienceLevel(editLevel);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditLevel(experienceLevel);
        setIsEditing(false);
    };

    const displayName =
        user?.fullName ??
        user?.firstName ??
        user?.emailAddresses[0]?.emailAddress ??
        "User";
    const displayEmail = user?.emailAddresses[0]?.emailAddress ?? "";
    const avatarInitial = displayName.charAt(0).toUpperCase();

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

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                    <LanguageSwitcher />
                </View>

                <SignedOut>
                    <View style={styles.header}>
                        <View style={styles.avatarContainer}>
                            <ThemedText style={styles.avatarText}>F</ThemedText>
                        </View>
                        <ThemedText style={styles.headerTitle}>
                            Finance-IT
                        </ThemedText>
                        <ThemedText style={styles.headerSubtitle}>
                            {t("Sign in to track your progress")}
                        </ThemedText>
                    </View>

                    <TouchableOpacity
                        style={[styles.authButton, styles.signInButton]}
                        activeOpacity={0.7}
                        onPress={() => router.push("/(auth)/sign-in")}
                    >
                        <ThemedText style={styles.authButtonText}>
                            {t("Sign In")}
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.authButton, styles.signUpButton]}
                        activeOpacity={0.7}
                        onPress={() => router.push("/(auth)/sign-up")}
                    >
                        <ThemedText style={styles.signUpButtonText}>
                            {t("Create Account")}
                        </ThemedText>
                    </TouchableOpacity>
                </SignedOut>

                <SignedIn>
                    <View style={styles.header}>
                        <View style={styles.avatarContainer}>
                            <ThemedText style={styles.avatarText}>
                                {avatarInitial}
                            </ThemedText>
                        </View>
                        <ThemedText style={styles.headerTitle}>
                            {displayName}
                        </ThemedText>
                        <ThemedText style={styles.headerSubtitle}>
                            {displayEmail}
                        </ThemedText>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <ThemedText style={styles.sectionTitle}>
                                {t("profile")}
                            </ThemedText>
                            {!isEditing && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditLevel(experienceLevel);
                                        setIsEditing(true);
                                    }}
                                >
                                    <ThemedText style={styles.editLink}>
                                        {t("edit")}
                                    </ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.fieldLabel}>
                                {t("name")}
                            </ThemedText>
                            <ThemedText style={styles.fieldValue}>
                                {displayName}
                            </ThemedText>
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.fieldLabel}>
                                {t("email")}
                            </ThemedText>
                            <ThemedText style={styles.fieldValue}>
                                {displayEmail}
                            </ThemedText>
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.fieldLabel}>
                                {t("experienceLevel")}
                            </ThemedText>
                            {isEditing ? (
                                <View style={styles.levelSelector}>
                                    {EXPERIENCE_LEVELS.map((level) => (
                                        <TouchableOpacity
                                            key={level}
                                            style={[
                                                styles.levelOption,
                                                editLevel === level &&
                                                    styles.levelOptionActive,
                                            ]}
                                            onPress={() => setEditLevel(level)}
                                        >
                                            <ThemedText
                                                style={[
                                                    styles.levelOptionText,
                                                    editLevel === level &&
                                                        styles.levelOptionTextActive,
                                                ]}
                                            >
                                                {level.charAt(0).toUpperCase() +
                                                    level.slice(1)}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <ThemedText style={styles.fieldValue}>
                                    {experienceLevel.charAt(0).toUpperCase() +
                                        experienceLevel.slice(1)}
                                </ThemedText>
                            )}
                        </View>

                        {isEditing && (
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSave}
                                    activeOpacity={0.7}
                                >
                                    <ThemedText style={styles.saveButtonText}>
                                        {t("save")}
                                    </ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                    activeOpacity={0.7}
                                >
                                    <ThemedText style={styles.cancelButtonText}>
                                        {t("cancel")}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <ThemedText style={styles.sectionTitle}>
                            {t("stats")}
                        </ThemedText>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <ThemedText style={styles.statNumber}>
                                    0
                                </ThemedText>
                                <ThemedText style={styles.statLabel}>
                                    {t("questionsAnswered")}
                                </ThemedText>
                            </View>
                            <View style={styles.statCard}>
                                <ThemedText style={styles.statNumber}>
                                    0%
                                </ThemedText>
                                <ThemedText style={styles.statLabel}>
                                    {t("accuracyRate")}
                                </ThemedText>
                            </View>
                            <View style={styles.statCard}>
                                <ThemedText style={styles.statNumber}>
                                    {streak ? streak.current : 0}
                                </ThemedText>
                                <ThemedText style={styles.statLabel}>
                                    {t("dayStreak")}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={styles.signOutContainer}>
                        <SignOutButton />
                    </View>
                </SignedIn>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0f1115",
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    header: {
        alignItems: "center",
        marginTop: 24,
        marginBottom: 24,
        rowGap: 8,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(10, 126, 164, 0.25)",
        borderWidth: 2,
        borderColor: "#0a7ea4",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: "700",
        color: "#0a7ea4",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
    },
    headerSubtitle: {
        fontSize: 15,
        color: "rgba(255, 255, 255, 0.5)",
    },

    authButton: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 32,
    },
    signInButton: {
        backgroundColor: "#0a7ea4",
        marginBottom: 12,
    },
    signUpButton: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        marginBottom: 32,
    },
    signUpButtonText: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 17,
        fontWeight: "700",
    },
    signOutButton: {
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.4)",
    },
    authButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },

    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 4,
    },
    editLink: {
        fontSize: 15,
        fontWeight: "600",
        color: "#0a7ea4",
    },

    field: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    fieldValue: {
        fontSize: 17,
        color: "#fff",
    },
    fieldInput: {
        fontSize: 17,
        color: "#fff",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },

    levelSelector: {
        flexDirection: "row",
        columnGap: 8,
    },
    levelOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    levelOptionActive: {
        backgroundColor: "rgba(10, 126, 164, 0.2)",
        borderColor: "#0a7ea4",
    },
    levelOptionText: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
    },
    levelOptionTextActive: {
        color: "#0a7ea4",
    },

    editActions: {
        flexDirection: "row",
        columnGap: 12,
        marginTop: 8,
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#0a7ea4",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
    },
    cancelButtonText: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 16,
        fontWeight: "600",
    },

    statsRow: {
        flexDirection: "row",
        columnGap: 12,
        marginTop: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        rowGap: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    statNumber: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0a7ea4",
    },
    statLabel: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.5)",
        textAlign: "center",
        lineHeight: 16,
    },

    signOutContainer: {
        alignItems: "center",
        marginTop: 8,
        marginBottom: 20,
    },
});
