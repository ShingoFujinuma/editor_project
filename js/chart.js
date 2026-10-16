import {
    TICK_TOLERANCE,
    LANE_IDS,
    LANE_INFO
} from "./config.js";

import {
    state
} from "./state.js";

import {
    tickToSeconds
} from "./timing.js";

export function getGridDivision() {
    return state.gridDivision;
}

export function getGridTickSize() {
    const tpb =
        Number(state.chart.tpb);

    const division =
        Number(state.gridDivision);

    if (
        !Number.isFinite(tpb) ||
        tpb <= 0 ||
        !Number.isInteger(division) ||
        division <= 0
    ) {
        return NaN;
    }

    return tpb
        * 4
        / division;
}

function getLaneRow(lane) {
    const info =
        LANE_INFO[lane];

    if (!info) {
        return null;
    }

    return info.direction === "down"
        ? 0
        : 1;
}

export function snapTickToGrid(tick) {
    const gridTickSize =
        getGridTickSize();

    if (
        !Number.isFinite(gridTickSize) ||
        gridTickSize <= 0
    ) {
        return NaN;
    }

    const snappedTick =
        Math.round(
            tick / gridTickSize
        ) * gridTickSize;

    return Math.max(
        0,
        snappedTick
    );
}

export function getTimeSignatures() {
    const source =
        state.editorSettings
            ?.timeSignatures;

    if (!Array.isArray(source)) {
        return [
            {
                tick: 0,
                numerator: 4,
                denominator: 4
            }
        ];
    }

    const signatures =
        source
            .map(signature => {
                return {
                    tick:
                        Number(signature.tick),

                    numerator:
                        Number(
                            signature.numerator
                        ),

                    denominator:
                        Number(
                            signature.denominator
                        )
                };
            })
            .filter(signature => {
                return (
                    Number.isFinite(
                        signature.tick
                    ) &&
                    signature.tick >= 0 &&
                    Number.isInteger(
                        signature.numerator
                    ) &&
                    signature.numerator > 0 &&
                    Number.isInteger(
                        signature.denominator
                    ) &&
                    [
                        1,
                        2,
                        4,
                        8,
                        16
                    ].includes(
                        signature.denominator
                    )
                );
            })
            .sort((first, second) => {
                return first.tick - second.tick;
            });

    if (
        signatures.length === 0 ||
        signatures[0].tick > 0
    ) {
        signatures.unshift({
            tick: 0,
            numerator: 4,
            denominator: 4
        });
    }

    return signatures;
}

export function getTimeSignatureAtTick(
    tick
) {
    const targetTick =
        Number(tick);

    let currentSignature = {
        tick: 0,
        numerator: 4,
        denominator: 4
    };

    for (
        const signature
        of getTimeSignatures()
    ) {
        if (
            signature.tick
            > targetTick
        ) {
            break;
        }

        currentSignature =
            signature;
    }

    return currentSignature;
}

export function setTimeSignatureAtTick(
    tick,
    numerator,
    denominator
) {
    const numericTick =
        Number(tick);

    const numericNumerator =
        Number(numerator);

    const numericDenominator =
        Number(denominator);

    if (
        !Number.isFinite(numericTick) ||
        numericTick < 0 ||
        !Number.isInteger(
            numericNumerator
        ) ||
        numericNumerator <= 0 ||
        ![
            1,
            2,
            4,
            8,
            16
        ].includes(
            numericDenominator
        )
    ) {
        return false;
    }

    const signatures =
        state.editorSettings
            .timeSignatures;

    const existingSignature =
        signatures.find(signature => {
            return (
                Math.abs(
                    Number(signature.tick)
                    - numericTick
                ) < TICK_TOLERANCE
            );
        });

    if (existingSignature) {
        existingSignature.numerator =
            numericNumerator;

        existingSignature.denominator =
            numericDenominator;
    } else {
        signatures.push({
            tick: numericTick,
            numerator: numericNumerator,
            denominator: numericDenominator
        });
    }

    signatures.sort(
        (first, second) => {
            return (
                Number(first.tick)
                - Number(second.tick)
            );
        }
    );

    return true;
}

export function removeTimeSignatureAtTick(
    tick
) {
    const numericTick =
        Number(tick);

    if (
        !Number.isFinite(numericTick) ||
        numericTick <= 0
    ) {
        return false;
    }

    const previousLength =
        state.editorSettings
            .timeSignatures
            .length;

    state.editorSettings.timeSignatures =
        state.editorSettings
            .timeSignatures
            .filter(signature => {
                return (
                    Math.abs(
                        Number(signature.tick)
                        - numericTick
                    ) >= TICK_TOLERANCE
                );
            });

    return (
        state.editorSettings
            .timeSignatures
            .length
        !== previousLength
    );
}

export function prepareNote(note) {
    const time =
        tickToSeconds(note.tick);

    if (note.type === "_bpm") {
        return {
            ...note,
            time
        };
    }

    let endTick =
        Number(note.tick);

    let endTime =
        time;

    let durationSeconds = 0;

    if (isHoldNote(note)) {
        endTick =
            Number(note.tick)
            + Number(note.duration ?? 0);

        endTime =
            tickToSeconds(endTick);

        durationSeconds =
            endTime - time;
    }

    return {
        ...note,
        time,
        endTick,
        endTime,
        durationSeconds
    };
}

export function prepareChartData() {
    if (!state.chart) {
        return;
    }

    state.chart.notes =
        state.chart.notes.map(
            prepareNote
        );

    sortChartNotes();
}

export function isHoldNote(note) {
    return (
        note.type === "long" ||
        note.type === "critical_long"
    );
}

export function isCriticalNote(note) {
    return (
        note.type === "critical" ||
        note.type === "critical_long"
    );
}


export function sortChartNotes() {
    state.chart.notes.sort(
        (first, second) => {
            const tickDifference =
                Number(first.tick)
                - Number(second.tick);

            if (
                Math.abs(tickDifference)
                >= TICK_TOLERANCE
            ) {
                return tickDifference;
            }

            if (
                first.type === "_bpm" &&
                second.type !== "_bpm"
            ) {
                return -1;
            }

            if (
                first.type !== "_bpm" &&
                second.type === "_bpm"
            ) {
                return 1;
            }

            return (
                Number(first.lane ?? -1)
                - Number(second.lane ?? -1)
            );
        }
    );
}

export function findNoteAtTick(
    lane,
    tick
) {
    if (!state.chart) {
        return null;
    }

    return state.chart.notes.find(note => {
        if (note.type === "_bpm") {
            return false;
        }

        const sameLane =
            Number(note.lane)
            === Number(lane);

        const sameTick =
            Math.abs(
                Number(note.tick)
                - Number(tick)
            ) < TICK_TOLERANCE;

        return sameLane && sameTick;
    }) ?? null;
}

export function getPlacementNoteType() {
    const baseType =
        state.placement.baseType;

    const critical =
        state.placement.critical;

    if (baseType === "hold") {
        return critical
            ? "critical_long"
            : "long";
    }

    return critical
        ? "critical"
        : "normal";
}

export function addTapNote(
    lane,
    tick,
    type = "normal"
) {
    if (!state.chart) {
        return false;
    }

    const allowedTypes = [
        "normal",
        "critical"
    ];

    if (!allowedTypes.includes(type)) {
        return false;
    }

    const numericLane =
        Number(lane);

    const numericTick =
        Number(tick);

    if (
        !canPlaceTapNote(
            numericLane,
            numericTick
        )
    ) {
        console.log(
            "既存ノーツまたはホールドと重なるため配置できません",
            {
                lane: numericLane,
                tick: numericTick,
                type
            }
        );

        return false;
    }

    const newNote =
        prepareNote({
            lane: numericLane,
            tick: numericTick,
            type
        });

    state.chart.notes.push(
        newNote
    );

    sortChartNotes();

    return true;
}

export function addHoldNote(
    lane,
    startTick,
    endTick,
    type = "long"
) {
    if (!state.chart) {
        return false;
    }

    const allowedTypes = [
        "long",
        "critical_long"
    ];

    if (!allowedTypes.includes(type)) {
        return false;
    }

    const numericLane =
        Number(lane);

    const numericStartTick =
        Number(startTick);

    const numericEndTick =
        Number(endTick);

    const actualStartTick =
        Math.min(
            numericStartTick,
            numericEndTick
        );

    const actualEndTick =
        Math.max(
            numericStartTick,
            numericEndTick
        );

    if (
        !canPlaceHoldNote(
            numericLane,
            actualStartTick,
            actualEndTick
        )
    ) {
        console.log(
            "既存ノーツまたはホールドと重なるため配置できません",
            {
                lane: numericLane,
                startTick: actualStartTick,
                endTick: actualEndTick,
                type
            }
        );

        return false;
    }

    const duration =
        actualEndTick
        - actualStartTick;

    const newNote =
        prepareNote({
            lane: numericLane,
            tick: actualStartTick,
            type,
            duration
        });

    state.chart.notes.push(
        newNote
    );

    sortChartNotes();

    return true;
}

export function removeNote(
    targetNote
) {
    if (
        !state.chart ||
        !targetNote
    ) {
        return false;
    }

    const index =
        state.chart.notes.indexOf(
            targetNote
        );

    if (index === -1) {
        return false;
    }

    if (
        targetNote.type === "_bpm"
    ) {
        return false;
    }

    state.chart.notes.splice(
        index,
        1
    );

    return true;
}

export function setBpmAtTick(
    tick,
    bpm
) {
    if (!state.chart) {
        return false;
    }

    const numericTick =
        Number(tick);

    const numericBpm =
        Number(bpm);

    if (
        !Number.isFinite(numericTick) ||
        numericTick < 0 ||
        !Number.isFinite(numericBpm) ||
        numericBpm <= 0
    ) {
        return false;
    }

    if (
        Math.abs(numericTick) < TICK_TOLERANCE
    ) {
        state.chart.bpm =
            numericBpm;

        prepareChartData();

        return true;
    }

    const existingEvent =
        state.chart.notes.find(note => {
            return (
                note.type === "_bpm" &&
                Math.abs(
                    Number(note.tick)
                    - numericTick
                ) < TICK_TOLERANCE
            );
        });

    if (existingEvent) {
        existingEvent.bpm =
            numericBpm;
    } else {
        state.chart.notes.push({
            type: "_bpm",
            tick: numericTick,
            bpm: numericBpm
        });
    }

    prepareChartData();

    return true;
}

export function removeBpmAtTick(
    tick
) {
    if (!state.chart) {
        return false;
    }

    const numericTick =
        Number(tick);

    if (
        !Number.isFinite(numericTick) ||
        numericTick <= 0
    ) {
        return false;
    }

    const previousLength =
        state.chart.notes.length;

    state.chart.notes =
        state.chart.notes.filter(note => {
            if (note.type !== "_bpm") {
                return true;
            }

            return (
                Math.abs(
                    Number(note.tick)
                    - numericTick
                ) >= TICK_TOLERANCE
            );
        });

    const removed =
        state.chart.notes.length
        !== previousLength;

    if (removed) {
        prepareChartData();
    }

    return removed;
}

export function clearSelection() {
    state.selection.notes = [];
    state.selection.anchorNote = null;
}

export function selectSingleNote(
    note
) {
    if (
        !note ||
        note.type === "_bpm"
    ) {
        clearSelection();
        return false;
    }

    state.selection.notes = [
        note
    ];

    state.selection.anchorNote =
        note;

    return true;
}

export function toggleNoteSelection(
    note
) {
    if (
        !note ||
        note.type === "_bpm"
    ) {
        return false;
    }

    const selectedIndex =
        state.selection.notes
            .indexOf(note);

    if (selectedIndex === -1) {
        // 未選択なら追加する
        if (
            state.selection.notes.length
            === 0
        ) {
            state.selection.anchorNote =
                note;
        }

        state.selection.notes.push(
            note
        );

        return true;
    }

    // 選択済みなら解除する
    state.selection.notes.splice(
        selectedIndex,
        1
    );

    /*
     * 解除したノーツがアンカーだった場合、
     * 残っている選択の先頭を新しいアンカーにする。
     */
    if (
        state.selection.anchorNote
        === note
    ) {
        state.selection.anchorNote =
            state.selection.notes[0]
            ?? null;
    }

    return true;
}

function getRangeSelectionLanes(
    startLane,
    endLane
) {
    const startInfo =
        LANE_INFO[startLane];

    const endInfo =
        LANE_INFO[endLane];

    const startRow =
        getLaneRow(startLane);

    const endRow =
        getLaneRow(endLane);

    if (
        !startInfo ||
        !endInfo ||
        startRow === null ||
        endRow === null
    ) {
        return [];
    }

    const minimumColumn =
        Math.min(
            startInfo.column,
            endInfo.column
        );

    const maximumColumn =
        Math.max(
            startInfo.column,
            endInfo.column
        );

    const minimumRow =
        Math.min(
            startRow,
            endRow
        );

    const maximumRow =
        Math.max(
            startRow,
            endRow
        );

    return LANE_IDS.filter(lane => {
        const info =
            LANE_INFO[lane];

        const row =
            getLaneRow(lane);

        if (
            !info ||
            row === null
        ) {
            return false;
        }

        const isInsideColumnRange =
            info.column >= minimumColumn &&
            info.column <= maximumColumn;

        const isInsideRowRange =
            row >= minimumRow &&
            row <= maximumRow;

        return (
            isInsideColumnRange &&
            isInsideRowRange
        );
    });
}

export function selectNoteRange(
    targetNote
) {
    if (
        !targetNote ||
        targetNote.type === "_bpm" ||
        !state.chart
    ) {
        return false;
    }

    let anchorNote =
        state.selection.anchorNote;

    if (
        !anchorNote ||
        !state.chart.notes.includes(
            anchorNote
        )
    ) {
        anchorNote =
            state.selection.notes[0];
    }

    if (!anchorNote) {
        return selectSingleNote(
            targetNote
        );
    }

    const startTick =
        Math.min(
            Number(anchorNote.tick),
            Number(targetNote.tick)
        );

    const endTick =
        Math.max(
            Number(anchorNote.tick),
            Number(targetNote.tick)
        );

    const targetLanes =
        getRangeSelectionLanes(
            anchorNote.lane,
            targetNote.lane
        );

    if (targetLanes.length === 0) {
        return false;
    }

    const selectedNotes =
        state.chart.notes.filter(
            note => {
                if (
                    note.type === "_bpm"
                ) {
                    return false;
                }

                const tick =
                    Number(note.tick);

                const lane =
                    Number(note.lane);

                const isInsideTickRange =
                    tick
                        >= startTick
                        - TICK_TOLERANCE &&
                    tick
                        <= endTick
                        + TICK_TOLERANCE;

                const isInsideLaneRange =
                    targetLanes.includes(
                        lane
                    );

                return (
                    isInsideTickRange &&
                    isInsideLaneRange
                );
            }
        );

    state.selection.notes =
        selectedNotes;

    state.selection.anchorNote =
        anchorNote;

    return selectedNotes.length > 0;
}

export function isNoteSelected(
    note
) {
    return state.selection.notes
        .includes(note);
}

export function getSelectedNotes() {
    return [
        ...state.selection.notes
    ];
}

function getToggledCriticalType(noteType) {
    switch (noteType) {
        case "normal":
            return "critical";

        case "critical":
            return "normal";

        case "long":
            return "critical_long";

        case "critical_long":
            return "long";

        default:
            return null;
    }
}

export function toggleSelectedNotesCritical() {
    if (
        !state.chart ||
        !state.selection ||
        state.selection.notes.length === 0
    ) {
        return false;
    }

    let changed = false;

    for (const note of state.selection.notes) {
        if (
            !note ||
            note.type === "_bpm"
        ) {
            continue;
        }

        const nextType =
            getToggledCriticalType(
                note.type
            );

        if (nextType === null) {
            continue;
        }

        note.type =
            nextType;

        changed = true;
    }

    return changed;
}

function createClipboardNote(note) {
    const result = {
        lane:
            Number(note.lane),

        tick:
            Number(note.tick),

        type:
            note.type
    };

    if (isHoldNote(note)) {
        result.duration =
            Number(note.duration);
    }

    return result;
}

export function copySelectedNotes() {
    const selectedNotes =
        getSelectedNotes();

    if (selectedNotes.length === 0) {
        return false;
    }

    const minimumTick =
        Math.min(
            ...selectedNotes.map(
                note => {
                    return Number(
                        note.tick
                    );
                }
            )
        );

    state.selection.clipboard =
        selectedNotes.map(
            note => {
                const copiedNote =
                    createClipboardNote(
                        note
                    );

                copiedNote.relativeTick =
                    Number(note.tick)
                    - minimumTick;

                delete copiedNote.tick;

                return copiedNote;
            }
        );

    return true;
}

export function deleteSelectedNotes() {
    const selectedNotes =
        getSelectedNotes();

    if (
        selectedNotes.length === 0 ||
        !state.chart
    ) {
        return false;
    }

    const selectedSet =
        new Set(
            selectedNotes
        );

    const previousLength =
        state.chart.notes.length;

    state.chart.notes =
        state.chart.notes.filter(
            note => {
                return !selectedSet.has(
                    note
                );
            }
        );

    clearSelection();

    return (
        state.chart.notes.length
        !== previousLength
    );
}

export function cutSelectedNotes() {
    const copied =
        copySelectedNotes();

    if (!copied) {
        return false;
    }

    return deleteSelectedNotes();
}

export function pasteClipboardNotes(
    baseTick
) {
    if (
        !state.chart ||
        state.selection.clipboard.length === 0
    ) {
        return {
            pastedCount: 0,
            skippedCount: 0
        };
    }

    const numericBaseTick =
        Number(baseTick);

    if (
        !Number.isFinite(numericBaseTick) ||
        numericBaseTick < 0
    ) {
        return {
            pastedCount: 0,
            skippedCount:
                state.selection.clipboard
                    .length
        };
    }

    const pastedNotes = [];

    let skippedCount = 0;

    const sortedClipboard =
        [...state.selection.clipboard]
            .sort((first, second) => {
                return (
                    Number(
                        first.relativeTick
                    )
                    - Number(
                        second.relativeTick
                    )
                );
            });

    for (
        const clipboardNote
        of sortedClipboard
    ) {
        const relativeTick =
            Number(
                clipboardNote.relativeTick
            );

        if (
            !Number.isFinite(relativeTick)
        ) {
            skippedCount += 1;
            continue;
        }

        const tick =
            numericBaseTick
            + relativeTick;

        const rawNote = {
            lane:
                Number(
                    clipboardNote.lane
                ),

            tick,

            type:
                clipboardNote.type
        };

        if (isHoldNote(clipboardNote)) {
            rawNote.duration =
                Number(
                    clipboardNote.duration
                );
        }

        let canPlace;

        if (isHoldNote(rawNote)) {
            canPlace =
                canPlaceHoldNote(
                    rawNote.lane,
                    rawNote.tick,
                    rawNote.tick
                        + rawNote.duration
                );
        } else {
            canPlace =
                canPlaceTapNote(
                    rawNote.lane,
                    rawNote.tick
                );
        }

        if (!canPlace) {
            skippedCount += 1;
            continue;
        }

        const pastedNote =
            prepareNote(rawNote);

        state.chart.notes.push(
            pastedNote
        );

        pastedNotes.push(
            pastedNote
        );
    }

    if (pastedNotes.length > 0) {
        sortChartNotes();

        state.selection.notes =
            pastedNotes;

        state.selection.anchorNote =
            pastedNotes[0] ?? null;
    }

    return {
        pastedCount:
            pastedNotes.length,

        skippedCount
    };
}

const HORIZONTAL_FLIP_LANES = {
    0: 2,
    2: 0,
    4: 6,
    6: 4
};

const VERTICAL_FLIP_LANES = {
    0: 4,
    4: 0,
    2: 6,
    6: 2
};

function canTransformSelection(
    laneConverter
) {
    const selectedNotes =
        getSelectedNotes();

    if (selectedNotes.length === 0) {
        return false;
    }

    const transformedNotes =
        selectedNotes.map(note => {
            const targetLane =
                laneConverter[
                    note.lane
                ];

            if (targetLane === undefined) {
                return null;
            }

            return {
                originalNote: note,

                transformedNote: {
                    lane: targetLane,
                    tick:
                        Number(note.tick),
                    type:
                        note.type,
                    duration:
                        isHoldNote(note)
                            ? Number(
                                note.duration
                            )
                            : undefined
                }
            };
        });

    if (
        transformedNotes.some(
            item => item === null
        )
    ) {
        return false;
    }

    const selectedSet =
        new Set(selectedNotes);

    for (const item of transformedNotes) {
        const transformed =
            item.transformedNote;

        let canPlace;

        if (isHoldNote(transformed)) {
            canPlace =
                canPlaceHoldNote(
                    transformed.lane,
                    transformed.tick,
                    transformed.tick
                        + transformed.duration,
                    selectedNotes
                );
        } else {
            canPlace =
                canPlaceTapNote(
                    transformed.lane,
                    transformed.tick,
                    selectedNotes
                );
        }

        if (!canPlace) {
            return false;
        }
    }

    return true;
}

export function flipSelectedNotesHorizontally() {
    if (
        !canTransformSelection(
            HORIZONTAL_FLIP_LANES
        )
    ) {
        return false;
    }

    for (
        const note
        of state.selection.notes
    ) {
        note.lane =
            HORIZONTAL_FLIP_LANES[
                note.lane
            ];
    }

    sortChartNotes();

    return true;
}

export function flipSelectedNotesVertically() {
    if (
        !canTransformSelection(
            VERTICAL_FLIP_LANES
        )
    ) {
        return false;
    }

    for (
        const note
        of state.selection.notes
    ) {
        note.lane =
            VERTICAL_FLIP_LANES[
                note.lane
            ];
    }

    sortChartNotes();

    return true;
}

function getNoteTickRange(note) {
    const startTick =
        Number(note.tick);

    if (!Number.isFinite(startTick)) {
        return null;
    }

    if (!isHoldNote(note)) {
        return {
            startTick,
            endTick: startTick
        };
    }

    const duration =
        Number(note.duration);

    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return null;
    }

    return {
        startTick,
        endTick:
            startTick + duration
    };
}

function isTickInsideHold(
    tick,
    holdNote
) {
    if (!isHoldNote(holdNote)) {
        return false;
    }

    const range =
        getNoteTickRange(holdNote);

    if (!range) {
        return false;
    }

    const numericTick =
        Number(tick);

    if (!Number.isFinite(numericTick)) {
        return false;
    }

    return (
        numericTick > range.startTick + TICK_TOLERANCE &&
        numericTick <= range.endTick - TICK_TOLERANCE
    );
}

export function canPlaceTapNote(
    lane,
    tick,
    ignoredNotes = []
) {
    if (!state.chart) {
        return false;
    }

    const numericLane =
        Number(lane);

    const numericTick =
        Number(tick);

    if (
        !Number.isFinite(numericLane) ||
        !Number.isFinite(numericTick) ||
        numericTick < 0
    ) {
        return false;
    }

    const ignoredSet =
        new Set(ignoredNotes);

    for (const note of state.chart.notes) {
        if (
            note.type === "_bpm" ||
            ignoredSet.has(note) ||
            Number(note.lane)
                !== numericLane
        ) {
            continue;
        }

        const sameStartTick =
            Math.abs(
                Number(note.tick)
                - numericTick
            ) < TICK_TOLERANCE;

        if (sameStartTick) {
            return false;
        }

        if (
            isTickInsideHold(
                numericTick,
                note
            )
        ) {
            return false;
        }
    }

    return true;
}

function doNoteRangesOverlap(
    firstRange,
    secondRange
) {
    if (
        !firstRange ||
        !secondRange
    ) {
        return false;
    }

    return (
        firstRange.startTick < secondRange.endTick - TICK_TOLERANCE &&
        firstRange.endTick > secondRange.startTick + TICK_TOLERANCE
    );
}

export function canPlaceHoldNote(
    lane,
    startTick,
    endTick,
    ignoredNotes = []
) {
    if (!state.chart) {
        return false;
    }

    const numericLane =
        Number(lane);

    const firstTick =
        Number(startTick);

    const secondTick =
        Number(endTick);

    if (
        !Number.isFinite(numericLane) ||
        !Number.isFinite(firstTick) ||
        !Number.isFinite(secondTick)
    ) {
        return false;
    }

    const actualStartTick =
        Math.min(
            firstTick,
            secondTick
        );

    const actualEndTick =
        Math.max(
            firstTick,
            secondTick
        );

    if (
        actualStartTick < 0 ||
        actualEndTick
            - actualStartTick
            <= TICK_TOLERANCE
    ) {
        return false;
    }

    const newRange = {
        startTick: actualStartTick,
        endTick: actualEndTick
    };

    const ignoredSet =
        new Set(ignoredNotes);

    for (const note of state.chart.notes) {
        if (
            note.type === "_bpm" ||
            ignoredSet.has(note) ||
            Number(note.lane)
                !== numericLane
        ) {
            continue;
        }

        const existingRange =
            getNoteTickRange(note);

        if (!existingRange) {
            continue;
        }

        if (isHoldNote(note)) {
            if (
                doNoteRangesOverlap(
                    newRange,
                    existingRange
                )
            ) {
                return false;
            }

            continue;
        }

        const tapTick =
            Number(note.tick);

        const tapInsideHold =
            tapTick > actualStartTick + TICK_TOLERANCE &&
            tapTick < actualEndTick - TICK_TOLERANCE;

        const tapAtHoldStart =
            Math.abs(
                tapTick
                - actualStartTick
            ) < TICK_TOLERANCE;

        if (
            tapInsideHold ||
            tapAtHoldStart
        ) {
            return false;
        }
    }

    return true;
}

export function findInvalidNoteOverlaps() {
    if (!state.chart) {
        return [];
    }

    const problems = [];

    const playableNotes =
        state.chart.notes.filter(
            note => {
                return note.type
                    !== "_bpm";
            }
        );

    for (
        let firstIndex = 0;
        firstIndex
            < playableNotes.length;
        firstIndex++
    ) {
        const first =
            playableNotes[firstIndex];

        for (
            let secondIndex =
                firstIndex + 1;
            secondIndex
                < playableNotes.length;
            secondIndex++
        ) {
            const second =
                playableNotes[
                    secondIndex
                ];

            if (
                Number(first.lane)
                !== Number(second.lane)
            ) {
                continue;
            }

            const sameStartTick =
                Math.abs(
                    Number(first.tick)
                    - Number(second.tick)
                ) < TICK_TOLERANCE;

            const firstContainsSecond =
                isTickInsideHold(
                    second.tick,
                    first
                );

            const secondContainsFirst =
                isTickInsideHold(
                    first.tick,
                    second
                );

            const bothHoldAndOverlapping =
                isHoldNote(first) &&
                isHoldNote(second) &&
                doNoteRangesOverlap(
                    getNoteTickRange(first),
                    getNoteTickRange(second)
                );

            if (
                sameStartTick ||
                firstContainsSecond ||
                secondContainsFirst ||
                bothHoldAndOverlapping
            ) {
                problems.push({
                    first,
                    second
                });
            }
        }
    }

    return problems;
}