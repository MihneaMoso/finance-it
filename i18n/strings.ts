/**
 * Minimal i18n scaffolding.
 *
 * Rules for this iteration:
 * - No hardcoded UI strings directly in new components
 * - Use the `t()` helper with a small language map
 *
 * TODO: Replace with a full i18n solution (e.g. i18next) when needed.
 */

type SupportedLang = "en" | "ro";

export const strings = {
    en: {
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
            lessonCompleteTitle: "Lesson complete",
            keepGoing: "Keep going",
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
            slides: "Lesson",
            quiz: "Quiz",
            next: "Next",
            startQuiz: "Start quiz",
            finish: "Finish",
            score: "Score",
            pass: "Passed",
            fail: "Try again",
        },
        simulation: {
            continue: "Continue",
            scenario: "Scenario",
        },
    },
    ro: {
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
            lessonCompleteTitle: "Lecție finalizată",
            keepGoing: "Continuă",
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
            slides: "Lecție",
            quiz: "Test",
            next: "Următor",
            startQuiz: "Începe testul",
            finish: "Finalizează",
            score: "Scor",
            pass: "Reușit",
            fail: "Încearcă din nou",
        },
        simulation: {
            continue: "Continuă",
            scenario: "Scenariu",
        },
    },
} as const;

let lang: SupportedLang = "en";

export function setLanguage(next: SupportedLang) {
    lang = next;
}

export function getLanguage(): SupportedLang {
    return lang;
}

/**
 * Tiny translation helper.
 *
 * Example: t(strings.en.tabs.home)
 * For dynamic keys, pass a getter.
 */
export function t<T>(getter: (s: typeof strings.en) => T): T {
    // @ts-expect-error narrow indexing
    return getter(strings[lang]);
}
