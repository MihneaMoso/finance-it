/**
 * i18next setup.
 *
 * - Default language: en
 * - Secondary: ro
 * - Persist language in AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "financeit/lang";

export const resources = {
    en: {
        translation: {
            tabs: {
                home: "Home",
                learn: "Learn",
                flashcards: "Flashcards",
                account: "Account",
            },
            hearts: {
                blockedTitle: "Out of hearts",
                blockedBody:
                    "You’ve used all your hearts for today. Come back later when they reset.",
            },
            common: {
                ok: "OK",
                notFound: "Not found",
                selectAnAnswer: "Select an answer",
            },
            learn: {
                title: "Learn",
                lesson: "Lesson",
                practice: "Practice",
                locked: "Locked",
                start: "Start",
                continue: "Continue",
                completed: "Completed",
                chapter: "Chapter",
                chapterTest: "Chapter test",
            },
            lesson: {
                next: "Next",
                score: "Score",
                pass: "Passed",
                fail: "Try again",
            },
            simulation: {
                continue: "Continue",
                scenario: "Scenario",
            },
            flashcards: {
                revisitingConcept: "Revisiting a concept",
                question: "Question",
                answer: "Answer",
                tapToReveal: "Tap to reveal answer",
                howWell: "How well did you know this?",
                didntKnow: "Didn't know",
                unsure: "Unsure",
                knewIt: "Knew it",
                responseRecorded: "✓ Response recorded",
            },
            notifications: {
                title: "Finance-IT",
                reminder1: "Don't break your streak 🔥",
                reminder2: "Quick practice today = smarter tomorrow",
                reminder3: "You're one lesson away from progress",
                warning1: "Your streak is at risk — come back for 2 minutes",
                warning2: "Keep it alive today 🔥",
                achievement1: "New streak record!",
                achievement2: "You're improving fast — keep going!",
            },
        },
    },
    ro: {
        translation: {
            tabs: {
                home: "Acasă",
                learn: "Învățare",
                flashcards: "Fișe",
                account: "Cont",
            },
            hearts: {
                blockedTitle: "Fără inimi",
                blockedBody:
                    "Ai folosit toate inimile pentru azi. Revino mai târziu când se resetează.",
            },
            common: {
                ok: "OK",
                notFound: "Nu a fost găsit",
                selectAnAnswer: "Alege un răspuns",
            },
            learn: {
                title: "Învățare",
                lesson: "Lecție",
                practice: "Exercițiu",
                locked: "Blocat",
                start: "Start",
                continue: "Continuă",
                completed: "Terminat",
                chapter: "Capitol",
                chapterTest: "Test capitol",
            },
            lesson: {
                next: "Următor",
                score: "Scor",
                pass: "Reușit",
                fail: "Încearcă din nou",
            },
            simulation: {
                continue: "Continuă",
                scenario: "Scenariu",
            },
            flashcards: {
                revisitingConcept: "Revenim la un concept",
                question: "Întrebare",
                answer: "Răspuns",
                tapToReveal: "Atinge pentru a vedea răspunsul",
                howWell: "Cât de bine ai știut asta?",
                didntKnow: "Nu știam",
                unsure: "Nesigur",
                knewIt: "Știam",
                responseRecorded: "✓ Răspuns salvat",
            },
            notifications: {
                title: "Finance-IT",
                reminder1: "Nu-ți rupe seria 🔥",
                reminder2: "Puțină practică azi = mai bine mâine",
                reminder3: "Mai ai doar o lecție până la progres",
                warning1: "Seria ta e în pericol — revino 2 minute",
                warning2: "Ține-o vie azi 🔥",
                achievement1: "Record nou de serie!",
                achievement2: "Progresezi rapid — continuă!",
            },
        },
    },
} as const;

async function getInitialLanguage(): Promise<string> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved || "en";
}

export async function initI18n() {
    const lng = await getInitialLanguage();

    await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: "en",
        interpolation: { escapeValue: false },
    });
}

export async function setAppLanguage(lang: "en" | "ro") {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
}

export default i18n;
