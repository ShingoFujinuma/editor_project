import {
    state
} from "./state.js";

import {
    prepareChartData
} from "./chart.js";

import {
    refreshPreviewEvents
} from "./audio-preview.js";

const MAX_HISTORY_COUNT = 100;

const undoStack = [];
const redoStack = [];

let historyChangeCallback = null;
let isRestoringHistory = false;

function cloneData(data) {
    if (
        typeof structuredClone
        === "function"
    ) {
        return structuredClone(data);
    }

    return JSON.parse(
        JSON.stringify(data)
    );
}

function createHistoryNote(note) {
    if (note.type === "_bpm") {
        return {
            type: "_bpm",
            tick: Number(note.tick),
            bpm: Number(note.bpm)
        };
    }

    const result = {
        lane: Number(note.lane),
        tick: Number(note.tick),
        type: note.type
    };

    if (
        note.type === "long" ||
        note.type === "critical_long"
    ) {
        result.duration =
            Number(note.duration);
    }

    return result;
}

function createSnapshot() {
    if (!state.chart) {
        return null;
    }

    const rawChart = {
        version:
            state.chart.version,

        title:
            state.chart.title,

        bpm:
            state.chart.bpm,

        tpb:
            state.chart.tpb,

        offset:
            state.chart.offset,

        notes:
            state.chart.notes.map(
                createHistoryNote
            )
    };

    return {
        chart:
            cloneData(rawChart),

        timeSignatures:
            cloneData(
                state.editorSettings
                    .timeSignatures
            )
    };
}

function restoreSnapshot(
    snapshot
) {
    if (!snapshot) {
        return false;
    }

    isRestoringHistory = true;

    try {
        state.chart =
            cloneData(
                snapshot.chart
            );

        state.editorSettings
            .timeSignatures =
            cloneData(
                snapshot.timeSignatures
            );

        state.placement.holdStart =
            null;

        state.selection.notes =
            [];
        state.selection.anchorNote = null;

        prepareChartData();

        refreshPreviewEvents();

        notifyHistoryChanged();

        return true;
    } finally {
        isRestoringHistory = false;
    }
}

function notifyHistoryChanged() {
    if (
        typeof historyChangeCallback
        !== "function"
    ) {
        return;
    }

    historyChangeCallback({
        canUndo:
            undoStack.length > 1,

        canRedo:
            redoStack.length > 0,

        undoCount:
            Math.max(
                0,
                undoStack.length - 1
            ),

        redoCount:
            redoStack.length
    });
}

export function initializeHistory() {
    undoStack.length = 0;
    redoStack.length = 0;

    const initialSnapshot =
        createSnapshot();

    if (initialSnapshot) {
        undoStack.push(
            initialSnapshot
        );
    }

    notifyHistoryChanged();
}

function snapshotsAreEqual(
    first,
    second
) {
    return JSON.stringify(first)
        === JSON.stringify(second);
}

export function commitHistory() {
    if (
        isRestoringHistory ||
        !state.chart
    ) {
        return;
    }

    const snapshot =
        createSnapshot();

    if (!snapshot) {
        return;
    }

    const latestSnapshot =
        undoStack[
            undoStack.length - 1
        ];

    if (
        latestSnapshot &&
        snapshotsAreEqual(
            latestSnapshot,
            snapshot
        )
    ) {
        return;
    }

    undoStack.push(snapshot);

    if (
        undoStack.length
        > MAX_HISTORY_COUNT
    ) {
        undoStack.shift();
    }

    redoStack.length = 0;

    notifyHistoryChanged();
}

export function undo() {
    if (undoStack.length <= 1) {
        return false;
    }

    const currentSnapshot =
        undoStack.pop();

    redoStack.push(
        currentSnapshot
    );

    const previousSnapshot =
        undoStack[
            undoStack.length - 1
        ];

    return restoreSnapshot(
        previousSnapshot
    );
}

export function redo() {
    if (redoStack.length === 0) {
        return false;
    }

    const snapshot =
        redoStack.pop();

    undoStack.push(
        cloneData(snapshot)
    );

    return restoreSnapshot(
        snapshot
    );
}

export function setHistoryChangeCallback(
    callback
) {
    historyChangeCallback =
        callback;

    notifyHistoryChanged();
}