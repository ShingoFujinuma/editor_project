import {
    assets,
    state,
    getTrack
} from "./state.js";

import {
    createEmptyChart
} from "./loader.js";

import {
    prepareChartData,
    clearSelection
} from "./chart.js";

import {
    initializeHistory
} from "./history.js";

import {
    refreshPreviewEvents,
    reinitializeAudioPreview
} from "./audio-preview.js";

export function hasLoadedTrack() {
    return Boolean(
        assets.sounds.track
    );
}

function selectLocalFile(
    accept
) {
    return new Promise(resolve => {
        const input =
            document.createElement(
                "input"
            );

        input.type =
            "file";

        input.accept =
            accept;

        input.multiple =
            false;

        input.addEventListener(
            "change",
            () => {
                const file =
                    input.files?.[0]
                    ?? null;

                resolve(file);
            },
            {
                once: true
            }
        );

        input.click();
    });
}

function waitForAudioReady(
    audio
) {
    return new Promise(
        (resolve, reject) => {
            const handleLoaded =
                () => {
                    cleanup();
                    resolve();
                };

            const handleError =
                () => {
                    cleanup();

                    reject(
                        new Error(
                            "音源ファイルを読み込めませんでした"
                        )
                    );
                };

            const cleanup =
                () => {
                    audio.removeEventListener(
                        "loadedmetadata",
                        handleLoaded
                    );

                    audio.removeEventListener(
                        "error",
                        handleError
                    );
                };

            audio.addEventListener(
                "loadedmetadata",
                handleLoaded,
                {
                    once: true
                }
            );

            audio.addEventListener(
                "error",
                handleError,
                {
                    once: true
                }
            );

            audio.load();
        }
    );
}

export async function openTrackFile() {
    const file =
        await selectLocalFile(
            "audio/*"
        );

    if (!file) {
        return false;
    }

    if (
        file.type &&
        !file.type.startsWith(
            "audio/"
        )
    ) {
        throw new Error(
            "音声ファイルを選択してください"
        );
    }

    const previousTrack =
        getTrack();

    if (previousTrack) {
        previousTrack.pause();
        previousTrack.currentTime = 0;
    }

    if (
        state.fileSession
            .trackObjectUrl
    ) {
        URL.revokeObjectURL(
            state.fileSession
                .trackObjectUrl
        );
    }

    const objectUrl =
        URL.createObjectURL(file);

    const track =
        new Audio();

    track.preload =
        "auto";

    track.src =
        objectUrl;

    await waitForAudioReady(
        track
    );

    assets.sounds.track =
        track;

    state.fileSession
        .trackObjectUrl =
        objectUrl;

    state.fileSession
        .trackFileName =
        file.name;

    state.chart =
        createEmptyChart();

    state.fileSession
        .chartFileName =
        null;

    clearSelection();

    prepareChartData();

    initializeHistory();

    await reinitializeAudioPreview();

    refreshPreviewEvents();

    console.log(
        "音源を読み込みました",
        {
            fileName:
                file.name,

            duration:
                track.duration
        }
    );

    return true;
}

function validateLoadedChart(
    chart
) {
    if (
        !chart ||
        typeof chart !== "object"
    ) {
        throw new Error(
            "JSONの内容がオブジェクトではありません"
        );
    }

    const bpm =
        Number(chart.bpm);

    const tpb =
        Number(chart.tpb);

    if (
        !Number.isFinite(bpm) ||
        bpm <= 0
    ) {
        throw new Error(
            "譜面の初期BPMが不正です"
        );
    }

    if (
        !Number.isFinite(tpb) ||
        tpb <= 0
    ) {
        throw new Error(
            "譜面のtpbが不正です"
        );
    }

    if (
        !Array.isArray(chart.notes)
    ) {
        throw new Error(
            "譜面のnotesが配列ではありません"
        );
    }
}

export async function openChartFile() {
    if (!hasLoadedTrack()) {
        throw new Error(
            "先に音源ファイルを読み込んでください"
        );
    }

    const shouldOpen =
        window.confirm(
            "現在の譜面を別の譜面で置き換えます。"
            + "\n保存していない変更は失われます。"
            + "\n続行しますか？"
        );

    if (!shouldOpen) {
        return false;
    }

    const file =
        await selectLocalFile(
            "application/json,.json"
        );

    if (!file) {
        return false;
    }

    let parsedChart;

    try {
        const jsonText =
            await file.text();

        parsedChart =
            JSON.parse(jsonText);
    } catch (error) {
        throw new Error(
            "譜面JSONを解析できませんでした",
            {
                cause: error
            }
        );
    }

    validateLoadedChart(
        parsedChart
    );

    const track =
        getTrack();

    if (track) {
        track.pause();
        track.currentTime = 0;
    }

    state.chart =
        parsedChart;

    state.fileSession
        .chartFileName =
        file.name;

    state.placement.holdStart =
        null;

    clearSelection();

    /*
     * 拍子はゲーム用JSONへ入っていないため、
     * 新しい譜面を開いたら初期値へ戻す。
     */
    state.editorSettings
        .timeSignatures = [
            {
                tick: 0,
                numerator: 4,
                denominator: 4
            }
        ];

    prepareChartData();

    initializeHistory();

    refreshPreviewEvents();

    console.log(
        "譜面を読み込みました",
        {
            fileName:
                file.name,

            noteCount:
                state.chart.notes
                    .length
        }
    );

    return true;
}

export async function openNextFile() {
    if (!hasLoadedTrack()) {
        return await openTrackFile();
    }

    return await openChartFile();
}

export async function replaceTrackFile() {
    return await openTrackFile();
}

window.addEventListener(
    "beforeunload",
    () => {
        if (
            state.fileSession
                .trackObjectUrl
        ) {
            URL.revokeObjectURL(
                state.fileSession
                    .trackObjectUrl
            );
        }
    }
);