
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { FlashcardCard } from "@/components/FlashcardCard";
import { getNextFlashcard } from "@/services/FlashcardService";
import type { Flashcard } from "@/types/questions";

export default function FlashcardsScreen() {
    const [flashcard, setFlashcard] = useState<Flashcard>(() =>
        getNextFlashcard(),
    );
    const [cardKey, setCardKey] = useState(0);

    const handleNext = useCallback(() => {
        setFlashcard(getNextFlashcard());
        setCardKey((prev) => prev + 1);
    }, []);

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <FlashcardCard
                key={cardKey}
                flashcard={flashcard}
                onNext={handleNext}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0f1115",
    },
});
