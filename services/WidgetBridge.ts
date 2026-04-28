import { NativeModules, Platform } from "react-native";

type WidgetBridgeNative = {
    setStreakCurrent(current: number): Promise<boolean>;
    setNextLesson(
        lessonId: string | null,
        title: string | null,
    ): Promise<boolean>;
    setFlashcardsJson(cardsJson: string | null): Promise<boolean>;
    getAndClearPendingFlashcardActions(): Promise<string>;
    forceUpdateAll(): Promise<boolean>;
};

const native: WidgetBridgeNative | null =
    Platform.OS === "android" && NativeModules.WidgetBridge
        ? (NativeModules.WidgetBridge as WidgetBridgeNative)
        : null;

export async function setStreakCurrent(current: number): Promise<void> {
    if (!native) return;
    await native.setStreakCurrent(current);
}

export async function setNextLesson(params: {
    lessonId: string | null;
    title: string | null;
}): Promise<void> {
    if (!native) return;
    await native.setNextLesson(params.lessonId, params.title);
}

export async function setFlashcardsJson(
    cardsJson: string | null,
): Promise<void> {
    if (!native) return;
    await native.setFlashcardsJson(cardsJson);
}

export async function getAndClearPendingFlashcardActions(): Promise<
    string | null
> {
    if (!native) return null;
    return await native.getAndClearPendingFlashcardActions();
}

export async function forceUpdateAllWidgets(): Promise<void> {
    if (!native) return;
    await native.forceUpdateAll();
}
