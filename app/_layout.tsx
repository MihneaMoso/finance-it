import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initI18n } from "@/i18n/i18n";

export const unstable_settings = {
    anchor: "(tabs)",
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error(
        "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables",
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [i18nReady, setI18nReady] = useState(false);

    useEffect(() => {
        void (async () => {
            await initI18n();
            setI18nReady(true);
        })();
    }, []);

    if (!i18nReady) {
        return null;
    }

    if (Platform.OS === "web") {
        document.title = "Finance-IT";
    }

    return (
        <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
            <ClerkProvider
                publishableKey={publishableKey}
                tokenCache={tokenCache}
            >
                <Stack>
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false, title: "Home" }}
                    />
                    <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false, title: "Account" }}
                    />
                    <Stack.Screen
                        name="lesson"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="simulation"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="modal"
                        options={{ presentation: "modal", title: "Modal" }}
                    />
                </Stack>
                <StatusBar style="auto" />
            </ClerkProvider>
        </ThemeProvider>
    );
}
