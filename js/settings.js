import {
    state
} from "./state.js";

const SETTINGS_STORAGE_KEY =
    "rhythm-chart-editor-settings";

const SETTINGS_VERSION = 1;

let saveTimerId = null;

const SAVE_DELAY_MS = 150;

function clampNumber(
    value,
    minimum,
    maximum,
    fallback
) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return Math.max(
        minimum,
        Math.min(
            numericValue,
            maximum
        )
    );
}

function clampInteger(
    value,
    minimum,
    maximum,
    fallback
) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    const integerValue =
        Math.round(numericValue);

    return Math.max(
        minimum,
        Math.min(
            integerValue,
            maximum
        )
    );
}

function createSettingsData() {
    return {
        version:
            SETTINGS_VERSION,

        gridDivision:
            state.gridDivision,

        noteSpeed:
            state.noteSpeed,

        playback: {
            trackVolume:
                state.playback
                    .trackVolume
        },

        audioPreview: {
            metronomeEnabled:
                state.audioPreview
                    .metronomeEnabled,

            answerEnabled:
                state.audioPreview
                    .answerEnabled,

            metronomeVolume:
                state.audioPreview
                    .metronomeVolume,

            answerVolume:
                state.audioPreview
                    .answerVolume,

            offsetMilliseconds:
                state.audioPreview
                    .offsetMilliseconds
        }
    };
}

function saveSettingsImmediately() {
    try {
        const settings =
            createSettingsData();

        const jsonText =
            JSON.stringify(settings);

        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            jsonText
        );
    } catch (error) {
        console.error(
            "エディター設定を保存できませんでした",
            error
        );
    }
}
``

export function saveEditorSettings() {
    if (saveTimerId !== null) {
        window.clearTimeout(
            saveTimerId
        );
    }

    saveTimerId =
        window.setTimeout(
            () => {
                saveTimerId = null;

                saveSettingsImmediately();
            },
            SAVE_DELAY_MS
        );
}

export function loadEditorSettings() {
    let savedText;

    try {
        savedText =
            localStorage.getItem(
                SETTINGS_STORAGE_KEY
            );
    } catch (error) {
        console.error(
            "エディター設定を取得できませんでした",
            error
        );

        return false;
    }

    if (savedText === null) {
        return false;
    }

    let savedSettings;

    try {
        savedSettings =
            JSON.parse(savedText);
    } catch (error) {
        console.error(
            "保存されたエディター設定が壊れています",
            error
        );

        localStorage.removeItem(
            SETTINGS_STORAGE_KEY
        );

        return false;
    }

    if (
        !savedSettings ||
        typeof savedSettings
            !== "object"
    ) {
        return false;
    }

    applySavedSettings(
        savedSettings
    );

    return true;
}

function applySavedSettings(
    savedSettings
) {
    state.gridDivision =
        clampInteger(
            savedSettings
                .gridDivision,

            1,
            192,
            state.gridDivision
        );

    state.noteSpeed =
        clampNumber(
            savedSettings
                .noteSpeed,

            100,
            1000,
            state.noteSpeed
        );

    const savedAudio =
        savedSettings.audioPreview;

    if (
        savedAudio &&
        typeof savedAudio === "object"
    ) {
        if (
            typeof savedAudio
                .metronomeEnabled
            === "boolean"
        ) {
            state.audioPreview
                .metronomeEnabled =
                savedAudio
                    .metronomeEnabled;
        }

        if (
            typeof savedAudio
                .answerEnabled
            === "boolean"
        ) {
            state.audioPreview
                .answerEnabled =
                savedAudio.answerEnabled;
        }

        state.audioPreview
            .metronomeVolume =
            clampNumber(
                savedAudio
                    .metronomeVolume,

                0,
                10,
                state.audioPreview
                    .metronomeVolume
            );

        state.audioPreview
            .answerVolume =
            clampNumber(
                savedAudio
                    .answerVolume,

                0,
                10,
                state.audioPreview
                    .answerVolume
            );

        state.audioPreview
            .offsetMilliseconds =
            clampInteger(
                savedAudio
                    .offsetMilliseconds,

                -1000,
                1000,
                state.audioPreview
                    .offsetMilliseconds
            );

        const savedPlayback =
            savedSettings.playback;
        
        if (
            savedPlayback &&
            typeof savedPlayback
                === "object"
        ) {
            state.playback.trackVolume =
                clampNumber(
                    savedPlayback.trackVolume,
                    0,
                    1,
                    state.playback.trackVolume
                );
        }
    }
}

export function clearEditorSettings() {
    try {
        localStorage.removeItem(
            SETTINGS_STORAGE_KEY
        );

        console.log(
            "保存済みのエディター設定を削除しました"
        );

        return true;
    } catch (error) {
        console.error(
            "エディター設定を削除できませんでした",
            error
        );

        return false;
    }
}