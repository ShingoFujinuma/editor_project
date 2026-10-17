import {
    assets,
    state,
    getTrack
} from "./state.js";

import {
    tickToSeconds,
    secondsToTick
} from "./timing.js";

import {
    getTimeSignatures
} from "./chart.js";

let audioContext = null;

const audioBuffers = {
    metronomeAccent: null,
    metronomeBeat: null,
    answer: null
};

let schedulerTimerId = null;

let previewEvents = [];

let eventIndex = 0;

let previousTrackTime = 0;

let eventsDirty = true;

const SCHEDULE_INTERVAL_MS = 25;
const SCHEDULE_LOOKAHEAD_SECONDS = 0.08;
const SEEK_DETECTION_THRESHOLD = 0.2;

async function createBufferFromAudioElement(
    audioElement
) {
    if (!audioElement) {
        throw new Error(
            "音声アセットがありません"
        );
    }

    const response =
        await fetch(audioElement.src);

    if (!response.ok) {
        throw new Error(
            `音声データを取得できません: ${audioElement.src}`
        );
    }

    const arrayBuffer =
        await response.arrayBuffer();

    return await audioContext.decodeAudioData(
        arrayBuffer
    );
}

export async function initializeAudioPreview() {
    await reinitializeAudioPreview();

    console.log(
        "プレビュー音声の準備が完了しました"
    );
}

export async function resumeAudioPreview() {
    if (!audioContext) {
        return;
    }

    if (
        audioContext.state
        === "suspended"
    ) {
        await audioContext.resume();
    }
}

const MAX_PREVIEW_VOLUME=10;

function scheduleBuffer(
    buffer,
    when,
    volume
) {
    if (
        !audioContext ||
        !buffer ||
        !Number.isFinite(when)
    ) {
        return;
    }

    const source =
        audioContext.createBufferSource();

    const gainNode =
        audioContext.createGain();

    source.buffer =
        buffer;

    const numericVolume =
        Number(volume);

    gainNode.gain.value =
        Number.isFinite(numericVolume)
            ? Math.max(
                0,
                Math.min(
                    numericVolume,
                    MAX_PREVIEW_VOLUME
                )
            )
            : 1;

    source.connect(
        gainNode
    );

    gainNode.connect(
        audioContext.destination
    );

    source.start(when);
}

function createMetronomeEvents(
    maximumTick
) {
    const signatures =
        getTimeSignatures();

    const events = [];

    for (
        let signatureIndex = 0;
        signatureIndex < signatures.length;
        signatureIndex++
    ) {
        const signature =
            signatures[signatureIndex];

        const nextSignature =
            signatures[
                signatureIndex + 1
            ];

        const sectionStart =
            Number(signature.tick);

        const sectionEnd =
            nextSignature
                ? Number(nextSignature.tick)
                : maximumTick;

        const numerator =
            Number(signature.numerator);

        const denominator =
            Number(signature.denominator);

        const tpb =
            Number(state.chart.tpb);

        const beatTickSize =
            tpb
            * 4
            / denominator;

        if (
            !Number.isFinite(beatTickSize) ||
            beatTickSize <= 0 ||
            !Number.isInteger(numerator) ||
            numerator <= 0
        ) {
            continue;
        }

        let beatTick =
            sectionStart;

        let beatIndex = 0;
        let safetyCount = 0;

        while (
            beatTick < sectionEnd - 0.001 &&
            beatTick <= maximumTick + 0.001
        ) {
            const isMeasureStart =
                beatIndex % numerator === 0;

            events.push({
                category: "metronome",

                tick:
                    beatTick,

                time:
                    tickToSeconds(
                        beatTick
                    ),

                accent:
                    isMeasureStart
            });

            beatTick +=
                beatTickSize;

            beatIndex++;
            safetyCount++;

            if (safetyCount > 100000) {
                console.warn(
                    "メトロノームイベントが多すぎるため生成を中止しました"
                );

                break;
            }
        }
    }

    return events;
}

function createAnswerEvents() {
    const events = [];

    for (
        const note of state.chart.notes
    ) {
        if (note.type === "_bpm") {
            continue;
        }

        const tick =
            Number(note.tick);

        const time =
            tickToSeconds(tick);

        if (
            !Number.isFinite(tick) ||
            !Number.isFinite(time)
        ) {
            continue;
        }

        events.push({
            category: "answer",
            tick,
            time
        });
    }

    return events;
}

export function rebuildPreviewEvents() {
    if (!state.chart) {
        previewEvents = [];
        return;
    }

    const track =
        getTrack();

    let maximumTick = 0;

    if (
        track &&
        Number.isFinite(
            track.duration
        )
    ) {
        maximumTick =
            secondsToTick(
                track.duration
            );
    }

    for (const note of state.chart.notes) {
        const noteEndTick =
            Number(note.tick)
            + Number(
                note.duration
                ?? 0
            );

        if (
            Number.isFinite(noteEndTick)
        ) {
            maximumTick =
                Math.max(
                    maximumTick,
                    noteEndTick
                );
        }
    }

    previewEvents = [
        ...createMetronomeEvents(
            maximumTick
        ),
        ...createAnswerEvents()
    ].sort((first, second) => {
        return (
            first.time
            - second.time
        );
    });

    eventsDirty = false;

    resetPreviewPosition();
}

export function markPreviewEventsDirty() {
    eventsDirty = true;
}

function findFirstEventIndexAtOrAfter(
    trackTime
) {
    let low = 0;

    let high =
        previewEvents.length;

    while (low < high) {
        const middle =
            Math.floor(
                (low + high) / 2
            );

        const effectiveTime =
            getEffectiveEventTime(
                previewEvents[middle]
            );

        if (
            effectiveTime < trackTime - 0.001
        ) {
            low =
                middle + 1;
        } else {
            high =
                middle;
        }
    }

    return low;
}

export function resetPreviewPosition() {
    const track =
        getTrack();

    if (!track) {
        eventIndex = 0;
        previousTrackTime = 0;
        return;
    }

    eventIndex =
        findFirstEventIndexAtOrAfter(
            track.currentTime
        );

    previousTrackTime =
        track.currentTime;
}

function schedulePreviewEvents() {
    const track =
        getTrack();

    if (
        !track ||
        !audioContext
    ) {
        return;
    }

    if (eventsDirty) {
        rebuildPreviewEvents();
    }

    if (track.paused) {
        resetPreviewPosition();
        return;
    }

    const currentTrackTime =
        track.currentTime;

    const expectedMovement =
        SCHEDULE_INTERVAL_MS
        / 1000;

    const actualMovement =
        currentTrackTime
        - previousTrackTime;

    const wasSeeked =
        actualMovement < -0.01 ||
        actualMovement
        > expectedMovement
        + SEEK_DETECTION_THRESHOLD;

    if (wasSeeked) {
        eventIndex =
            findFirstEventIndexAtOrAfter(
                currentTrackTime
            );
    }

    const playbackRate =
        getCurrentPlaybackRate();

    const scheduleEndTime =
        currentTrackTime
        + SCHEDULE_LOOKAHEAD_SECONDS
        * playbackRate;

    while (
        eventIndex
        < previewEvents.length
    ) {
        const event =
            previewEvents[eventIndex];

        const effectiveEventTime =
            getEffectiveEventTime(event);

        if (
            effectiveEventTime
            > scheduleEndTime
        ) {
            break;
        }

        if (
            effectiveEventTime
            >= currentTrackTime - 0.01
        ) {
            const trackTimeDifference =
                effectiveEventTime
                - currentTrackTime;

            const previewOffsetSeconds =
                getPreviewOffsetSeconds();
            
            const delay =
                Math.max(
                    0,
                    trackTimeDifference
                    / playbackRate
                    + previewOffsetSeconds
                );

            const audioContextTime =
                audioContext.currentTime
                + delay;

            if (
                event.category
                    === "metronome" &&
                state.audioPreview
                    .metronomeEnabled
            ) {
                const buffer =
                    event.accent
                        ? audioBuffers
                            .metronomeAccent
                        : audioBuffers
                            .metronomeBeat;

                scheduleBuffer(
                    buffer,
                    audioContextTime,
                    state.audioPreview
                        .metronomeVolume
                );
            }

            if (
                event.category
                    === "answer" &&
                state.audioPreview
                    .answerEnabled
            ) {
                scheduleBuffer(
                    audioBuffers.answer,
                    audioContextTime,
                    state.audioPreview
                        .answerVolume
                );
            }
        }

        eventIndex++;
    }

    previousTrackTime = currentTrackTime;
}

export function startAudioPreviewScheduler() {
    if (schedulerTimerId !== null) {
        return;
    }

    resetPreviewPosition();

    schedulerTimerId =
        window.setInterval(
            schedulePreviewEvents,
            SCHEDULE_INTERVAL_MS
        );
}

export function stopAudioPreviewScheduler() {
    if (schedulerTimerId === null) {
        return;
    }

    window.clearInterval(
        schedulerTimerId
    );

    schedulerTimerId = null;
}

function getPreviewOffsetSeconds() {
    const offsetMilliseconds =
        Number(
            state.audioPreview
                .offsetMilliseconds
        );

    if (
        !Number.isFinite(
            offsetMilliseconds
        )
    ) {
        return 0;
    }

    return offsetMilliseconds / 1000;
}

function getEffectiveEventTime(event) {
    return event.time;
}

export function notifyPreviewOffsetChanged() {
    resetPreviewPosition();
}

export function refreshPreviewEvents() {
    eventsDirty = true;

    rebuildPreviewEvents();
    resetPreviewPosition();
}



export async function reinitializeAudioPreview() {
    if (!audioContext) {
        audioContext =
            new AudioContext();
    }

    if (
        audioContext.state
        === "suspended"
    ) {
        try {
            await audioContext.resume();
        } catch {
            // ユーザー操作前なら suspended のままで問題ない
        }
    }

    if (
        !audioBuffers
            .metronomeAccent
    ) {
        audioBuffers
            .metronomeAccent =
            await createBufferFromAudioElement(
                assets.sounds
                    .metronomeAccent
            );
    }

    if (
        !audioBuffers
            .metronomeBeat
    ) {
        audioBuffers
            .metronomeBeat =
            await createBufferFromAudioElement(
                assets.sounds
                    .metronomeBeat
            );
    }

    if (!audioBuffers.answer) {
        audioBuffers.answer =
            await createBufferFromAudioElement(
                assets.sounds.answer
            );
    }

    refreshPreviewEvents();
}

function getCurrentPlaybackRate() {
    const track =
        getTrack();

    const playbackRate =
        Number(
            track?.playbackRate
            ?? state.playback
                .playbackRate
            ?? 1
        );

    if (
        !Number.isFinite(playbackRate) ||
        playbackRate <= 0
    ) {
        return 1;
    }

    return playbackRate;
}