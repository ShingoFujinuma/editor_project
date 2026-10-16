import {
    state
} from "./state.js";

export function getBpmEvents() {
    if (!state.chart) {
        return [];
    }

    return state.chart.notes
        .filter(note => {
            return note.type === "_bpm";
        })
        .map(note => {
            return {
                ...note,
                tick: Number(note.tick),
                bpm: Number(note.bpm)
            };
        })
        .filter(note => {
            return (
                Number.isFinite(note.tick) &&
                note.tick >= 0 &&
                Number.isFinite(note.bpm) &&
                note.bpm > 0
            );
        })
        .sort((first, second) => {
            return first.tick - second.tick;
        });
}

export function getBpmAtTick(
    targetTick
) {
    let bpm =
        Number(state.chart.bpm);

    for (
        const event
        of getBpmEvents()
    ) {
        if (event.tick > targetTick) {
            break;
        }

        bpm =
            event.bpm;
    }

    return bpm;
}

export function tickToSeconds(
    targetTick
) {
    const chart =
        state.chart;

    const numericTick =
        Number(targetTick);

    const tpb =
        Number(chart.tpb);

    const initialBpm =
        Number(chart.bpm);

    if (
        !Number.isFinite(numericTick) ||
        !Number.isFinite(tpb) ||
        !Number.isFinite(initialBpm) ||
        tpb <= 0 ||
        initialBpm <= 0
    ) {
        return NaN;
    }

    if (numericTick <= 0) {
        return 0;
    }

    let totalSeconds = 0;
    let previousTick = 0;
    let currentBpm = initialBpm;

    for (
        const event
        of getBpmEvents()
    ) {
        if (event.tick <= previousTick) {
            currentBpm =
                event.bpm;

            continue;
        }

        if (event.tick >= numericTick) {
            break;
        }

        const sectionTicks =
            event.tick - previousTick;

        totalSeconds +=
            sectionTicks
            / tpb
            * (60 / currentBpm);

        previousTick =
            event.tick;

        currentBpm =
            event.bpm;
    }

    const remainingTicks =
        numericTick - previousTick;

    totalSeconds +=
        remainingTicks
        / tpb
        * (60 / currentBpm);

    return totalSeconds;
}

export function secondsToTick(
    targetSeconds
) {
    const chart =
        state.chart;

    const numericSeconds =
        Number(targetSeconds);

    const tpb =
        Number(chart.tpb);

    const initialBpm =
        Number(chart.bpm);

    if (
        !Number.isFinite(numericSeconds) ||
        !Number.isFinite(tpb) ||
        !Number.isFinite(initialBpm) ||
        tpb <= 0 ||
        initialBpm <= 0
    ) {
        return NaN;
    }

    if (numericSeconds <= 0) {
        return 0;
    }

    let remainingSeconds =
        numericSeconds;

    let previousTick = 0;
    let currentBpm =
        initialBpm;

    for (
        const event
        of getBpmEvents()
    ) {
        if (event.tick <= previousTick) {
            currentBpm =
                event.bpm;

            continue;
        }

        const sectionTicks =
            event.tick - previousTick;

        const sectionSeconds =
            sectionTicks
            / tpb
            * (60 / currentBpm);

        if (
            remainingSeconds
            <= sectionSeconds
        ) {
            return previousTick
                + remainingSeconds
                * tpb
                * (currentBpm / 60);
        }

        remainingSeconds -=
            sectionSeconds;

        previousTick =
            event.tick;

        currentBpm =
            event.bpm;
    }

    return previousTick
        + remainingSeconds
        * tpb
        * (currentBpm / 60);
}