import {
    SCENE
} from "./config.js";

export const canvas =
    document.getElementById("game");

export const ctx =
    canvas.getContext("2d");

export const assets = {
    images: {},
    sounds: {}
};

export const state = {
    currentScene: SCENE.LOADING,

    chart: null,

    noteSpeed: 600,
    gridDivision: 16,

    placement: {
        baseType: "tap",
        critical: false,
        holdStart: null
    },

    selection: {
        notes: [],
        clipboard: [],
        anchorNote: null
    },

    audioPreview: {
        metronomeEnabled: true,
        answerEnabled: true,

        metronomeVolume: 1.5,
        answerVolume: 1.5,

        offsetMilliseconds: 0
    },

    editorSettings: {
        timeSignatures: [
            {
                tick: 0,
                numerator: 4,
                denominator: 4
            }
        ]
    }
};

export function getTrack() {
    return assets.sounds.track;
}

export function getJudgeY() {
    return canvas.height / 2;
}