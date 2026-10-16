import {
    SCENE,
    LANE_INFO,
    LANE_COLUMN_COUNT,
    LANE_WIDTH,
    NOTE_WIDTH,
    NOTE_HEIGHT,
    HOLD_BODY_WIDTH,
    NOTE_SPEED_STEP,
    GRID_SNAP_TOLERANCE_TICKS
} from "./config.js";

import {
    canvas,
    state,
    getTrack,
    getJudgeY
} from "./state.js";

import {
    secondsToTick,
    tickToSeconds
} from "./timing.js";

import {
    getGridTickSize,
    snapTickToGrid,
    getPlacementNoteType,
    addTapNote,
    addHoldNote,
    removeNote,
    isHoldNote,
    selectSingleNote,
    clearSelection,
    toggleNoteSelection,
    selectNoteRange,
    copySelectedNotes,
    cutSelectedNotes,
    pasteClipboardNotes,
    deleteSelectedNotes,
    flipSelectedNotesHorizontally,
    flipSelectedNotesVertically
} from "./chart.js";

import {
    getLaneAreaLeft,
    getLaneX,
    timeToY
} from "./renderer.js";

import {
    changeGridDivision,
    changeNoteSpeed,
    updateTimingControls,
    updateNoteTypeControls,
    handleSaveChart,
    markChartAsUnsaved,
    handleUndo,
    handleRedo,
    updateSelectionControls,
    handleCopySelectedNotes,
    handleCutSelectedNotes,
    handlePasteSelectedNotes,
    handleDeleteSelectedNotes,
    handleFlipHorizontal,
    handleFlipVertical,
    handleToggleSelectedCritical,
    handleOpenFile
} from "./ui.js";

import {
    resumeAudioPreview,
    resetPreviewPosition,
    markPreviewEventsDirty,
    refreshPreviewEvents
} from "./audio-preview.js";

import {
    commitHistory
} from "./history.js";

import {
    showWarningOnce
} from "./notifications.js";

const NOTE_HIT_PADDING_X = 8;
const NOTE_HIT_PADDING_Y = 8;
const ALT_FOCUS_GUARD_MS = 300;

let editorAltKeyPressed = false;
let lastAltReleaseTime = 0;

function getCanvasMousePosition(event) {
    const rect =
        canvas.getBoundingClientRect();

    const scaleX =
        canvas.width / rect.width;

    const scaleY =
        canvas.height / rect.height;

    return {
        x:
            (event.clientX - rect.left)
            * scaleX,

        y:
            (event.clientY - rect.top)
            * scaleY
    };
}

function getLaneAtPosition(
    x,
    y
) {
    const laneAreaLeft =
        getLaneAreaLeft();

    const laneAreaWidth =
        LANE_COLUMN_COUNT
        * LANE_WIDTH;

    const laneAreaRight =
        laneAreaLeft
        + laneAreaWidth;

    if (
        x < laneAreaLeft ||
        x >= laneAreaRight
    ) {
        return null;
    }

    const column =
        Math.floor(
            (x - laneAreaLeft)
            / LANE_WIDTH
        );

    if (
        column < 0 ||
        column >= LANE_COLUMN_COUNT
    ) {
        return null;
    }

    if (y < getJudgeY()) {
        return column === 0
            ? 0
            : 2;
    }

    return column === 0
        ? 4
        : 6;
}

function yToTime(
    y,
    lane
) {
    const track =
        getTrack();

    const info =
        LANE_INFO[lane];

    if (!track || !info) {
        return null;
    }

    const judgeY =
        getJudgeY();

    if (info.direction === "down") {
        return track.currentTime
            + (judgeY - y)
            / state.noteSpeed;
    }

    return track.currentTime
        + (y - judgeY)
        / state.noteSpeed;
}

function isYVisibleInLane(
    y,
    lane,
    margin = 0
) {
    const info =
        LANE_INFO[lane];

    if (
        !info ||
        !Number.isFinite(y)
    ) {
        return false;
    }

    const judgeY =
        getJudgeY();

    if (
        info.direction === "down"
    ) {
        return (
            y >= -margin &&
            y <= judgeY + margin
        );
    }

    return (
        y >= judgeY - margin &&
        y <= canvas.height + margin
    );
}

async function togglePlayback() {
    const track =
        getTrack();

    if (!track) {
        console.log(
            "先に音源ファイルを読み込んでください"
        );

        // handleOpenFile();

        return;
    }

    if (track.paused) {
        await resumeAudioPreview();

        resetPreviewPosition();

        try {
            await track.play();
        } catch (error) {
            console.error(
                "楽曲を再生できませんでした",
                error
            );
        }
    } else {
        track.pause();

        resetPreviewPosition();

        updateTimingControls();
    }
}

function selectTapPlacementMode() {
    state.placement.baseType =
        "tap";

    state.placement.holdStart =
        null;

    updateNoteTypeControls();
}

function selectHoldPlacementMode() {
    state.placement.baseType =
        "hold";

    state.placement.holdStart =
        null;

    updateNoteTypeControls();
}

function toggleCriticalPlacement() {
    state.placement.critical =
        !state.placement.critical;

    state.placement.holdStart =
        null;

    updateNoteTypeControls();
}

function isButtonElement(element) {
    if (!element) {
        return false;
    }

    return (
        element.tagName
            ?.toLowerCase()
        === "button"
    );
}

function handleKeyDown(event) {
    if (
        state.currentScene
        !== SCENE.EDITOR
    ) {
        return;
    }

    const isEditingText =
        isTextEditingElement(
            document.activeElement
        );

    if(
        event.code === "AltLeft" ||
        event.code === "AltRight"
    ){
        if(!isEditingText){
            editorAltKeyPressed=true;
            event.preventDefault();
            focusCanvas();
        }
        return;
    }

    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.code === "KeyZ" &&
        !isEditingText
    ) {
        event.preventDefault();

        handleUndo();

        return;
    }

    if (
        event.ctrlKey &&
        event.code === "KeyY" &&
        !isEditingText
    ) {
        event.preventDefault();

        handleRedo();

        return;
    }

    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.code === "KeyZ" &&
        !isEditingText
    ) {
        event.preventDefault();

        handleRedo();

        return;
    }

    if (
        event.ctrlKey &&
        event.code === "KeyC" &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleCopySelectedNotes();
    
        return;
    }
    
    if (
        event.ctrlKey &&
        event.code === "KeyX" &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleCutSelectedNotes();
    
        return;
    }
    
    if (
        event.ctrlKey &&
        event.code === "KeyV" &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handlePasteSelectedNotes();
    
        return;
    }

    if (
        event.ctrlKey &&
        event.code === "KeyO" &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleOpenFile();
    
        return;
    }
    
    if (
        (
            event.code === "Delete" ||
            event.code === "Backspace"
        ) &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleDeleteSelectedNotes();
    
        return;
    }

    if (
        event.code === "KeyF" &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleFlipHorizontal();
    
        return;
    }
    
    if (
        event.code === "KeyG" &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditingText
    ) {
        event.preventDefault();
    
        handleFlipVertical();
    
        return;
    }

    if (
        event.ctrlKey &&
        event.code === "KeyS"
    ) {
        event.preventDefault();

        handleSaveChart();

        return;
    }

    if (
        isEditingText ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
    ) {
        return;
    }

    if (
        event.code === "KeyQ" &&
        !event.repeat
    ) {
        event.preventDefault();
    
        selectTapPlacementMode();
    
        return;
    }
    
    if (
        event.code === "KeyW" &&
        !event.repeat
    ) {
        event.preventDefault();
    
        selectHoldPlacementMode();
    
        return;
    }
    
    if (
        event.code === "KeyE" &&
        !event.repeat
    ) {
        event.preventDefault();
    
        if (
            state.placement.baseType
            === "select"
        ) {
            handleToggleSelectedCritical();
        } else {
            toggleCriticalPlacement();
        }
    
        return;
    }
    
    if (
        event.code === "KeyR" &&
        !event.repeat
    ) {
        event.preventDefault();
    
        selectSelectionMode();
    
        return;
    }

    if (
        event.code === "Space" &&
        !event.repeat &&
        !isEditingText
    ) {
        const activeElement =
            document.activeElement;
    
        const buttonIsFocused =
            isButtonElement(
                activeElement
            );
    
        const altFocusGuardActive =
            editorAltKeyPressed ||
            wasAltRecentlyReleased();
    
        if (
            buttonIsFocused &&
            !altFocusGuardActive
        ) {
            return;
        }
    
        event.preventDefault();
    
        focusCanvas();
    
        togglePlayback();
    
        return;
    }
    ``

    if (event.code === "Escape") {
        state.placement.holdStart =
            null;

        return;
    }
}

function handleKeyUp(event) {
    if (
        event.code === "AltLeft" ||
        event.code === "AltRight"
    ) {
        editorAltKeyPressed = false;

        lastAltReleaseTime =
            performance.now();

        event.preventDefault();

        focusCanvas();
    }
}

function getPlacementPositionFromMouse(
    event
) {
    const mouse =
        getCanvasMousePosition(event);

    const lane =
        getLaneAtPosition(
            mouse.x,
            mouse.y
        );

    if (lane === null) {
        return null;
    }

    const time =
        yToTime(
            mouse.y,
            lane
        );

    if (
        time === null ||
        !Number.isFinite(time) ||
        time < 0
    ) {
        return null;
    }

    const rawTick =
        secondsToTick(time);

    if (!Number.isFinite(rawTick)) {
        return null;
    }

    const snappedTick =
        snapTickToGrid(rawTick);

    if (!Number.isFinite(snappedTick)) {
        return null;
    }

    return {
        lane,
        tick: snappedTick,
        mouse
    };
}

function placeNoteFromMouse(event) {
    if (
        state.currentScene
        !== SCENE.EDITOR
    ) {
        return;
    }

    const track =
        getTrack();

    if (!track || !track.paused) {
        return;
    }

    const position =
        getPlacementPositionFromMouse(
            event
        );

    if (!position) {
        return;
    }

    if (
        state.placement.baseType
        === "hold"
    ) {
        placeHoldNote(position);
        return;
    }

    placeTapNote(position);
}

function placeTapNote(position) {
    const type =
        getPlacementNoteType();

    const added =
        addTapNote(
            position.lane,
            position.tick,
            type
        );

    if (!added) {
        showWarningOnce(
            "note-placement-conflict",
            "同じ位置のノーツ、またはホールドの途中には配置できません。",
            "ノーツを配置できません"
        );

        return;
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
}

function placeHoldNote(position) {
    const pending =
        state.placement.holdStart;

    if (!pending) {
        state.placement.holdStart = {
            lane: position.lane,
            tick: position.tick
        };

        console.log(
            "ホールド始点を設定しました",
            state.placement.holdStart
        );

        return;
    }

    if (
        pending.lane
        !== position.lane
    ) {
        state.placement.holdStart = {
            lane: position.lane,
            tick: position.tick
        };

        console.log(
            "異なるレーンが選択されたため、ホールド始点を置き直しました",
            state.placement.holdStart
        );

        return;
    }

    const type =
        getPlacementNoteType();

        const added =
        addHoldNote(
            pending.lane,
            pending.tick,
            position.tick,
            type
        );
    
    if (!added) {
        showWarningOnce(
            "hold-placement-conflict",
            "既存のノーツまたはホールドと重なるため配置できません。",
            "ホールドを配置できません"
        );
    
        return;
    }    

    if (added) {
        console.log(
            "ホールドノーツを配置しました",
            {
                lane: pending.lane,
                startTick: pending.tick,
                endTick: position.tick,
                type
            }
        );

        state.placement.holdStart =
            null;

        refreshPreviewEvents();
        markChartAsUnsaved();
        commitHistory();
    }
}

function findNoteAtMousePosition(
    mouseX,
    mouseY
) {
    const track =
        getTrack();

    if (
        !track ||
        !state.chart
    ) {
        return null;
    }

    const clickedLane =
        getLaneAtPosition(
            mouseX,
            mouseY
        );

    if (clickedLane === null) {
        return null;
    }

    let closestNote = null;
    let closestDistance =
        Infinity;

    for (
        const note
        of state.chart.notes
    ) {
        if (note.type === "_bpm") {
            continue;
        }

        /*
         * クリックしたレーン以外は対象外。
         *
         * lane 0と4、lane 2と6は
         * 同じX座標を共有するため、この判定が重要。
         */
        if (
            Number(note.lane)
            !== Number(clickedLane)
        ) {
            continue;
        }

        const noteX =
            getLaneX(note.lane);

        const startY =
            timeToY(
                note.time,
                track.currentTime,
                note.lane
            );

        if (
            noteX === null ||
            !Number.isFinite(startY)
        ) {
            continue;
        }

        /*
         * タップノーツまたはホールド始点が、
         * レーンの表示領域に入っているか確認する。
         */
        const startIsVisible =
            isYVisibleInLane(
                startY,
                note.lane,
                NOTE_HEIGHT / 2
            );

        /*
         * ホールドノーツの場合は、
         * クリッピング後に見えている本体も判定する。
         */
        if (isHoldNote(note)) {
            const endY =
                timeToY(
                    note.endTime,
                    track.currentTime,
                    note.lane
                );

            if (!Number.isFinite(endY)) {
                continue;
            }

            const visibleBodyRange =
                getVisibleHoldBodyRange(
                    startY,
                    endY,
                    note.lane
                );

            if (visibleBodyRange) {
                const insideHoldBody =
                    mouseX >=
                        noteX
                        - HOLD_BODY_WIDTH / 2
                        - NOTE_HIT_PADDING_X &&

                    mouseX <=
                        noteX
                        + HOLD_BODY_WIDTH / 2
                        + NOTE_HIT_PADDING_X &&

                    mouseY >=
                        visibleBodyRange.top
                        - NOTE_HIT_PADDING_Y &&

                    mouseY <=
                        visibleBodyRange.bottom
                        + NOTE_HIT_PADDING_Y;

                if (insideHoldBody) {
                    const horizontalDistance =
                        Math.abs(
                            mouseX - noteX
                        );

                    const verticalDistance =
                        distanceToRange(
                            mouseY,
                            visibleBodyRange.top,
                            visibleBodyRange.bottom
                        );

                    const distance =
                        horizontalDistance
                        + verticalDistance;

                    if (
                        distance < closestDistance
                    ) {
                        closestDistance =
                            distance;

                        closestNote =
                            note;
                    }
                }
            }
        }

        /*
         * 始点が見えていない場合、
         * タップ部分のヒット判定は行わない。
         *
         * ホールド本体については上で判定済み。
         */
        if (!startIsVisible) {
            continue;
        }

        const horizontalDistance =
            Math.abs(
                mouseX - noteX
            );

        const verticalDistance =
            Math.abs(
                mouseY - startY
            );

        const insideWidth =
            horizontalDistance
            <= NOTE_WIDTH / 2
            + NOTE_HIT_PADDING_X;

        const insideHeight =
            verticalDistance
            <= NOTE_HEIGHT / 2
            + NOTE_HIT_PADDING_Y;

        if (
            !insideWidth ||
            !insideHeight
        ) {
            continue;
        }

        const distance =
            horizontalDistance
            + verticalDistance;

        if (
            distance < closestDistance
        ) {
            closestDistance =
                distance;

            closestNote =
                note;
        }
    }

    return closestNote;
}

function getVisibleHoldBodyRange(
    startY,
    endY,
    lane
) {
    const info =
        LANE_INFO[lane];

    if (
        !info ||
        !Number.isFinite(startY) ||
        !Number.isFinite(endY)
    ) {
        return null;
    }

    const judgeY =
        getJudgeY();

    const bodyTop =
        Math.min(
            startY,
            endY
        );

    const bodyBottom =
        Math.max(
            startY,
            endY
        );

    let visibleTop;
    let visibleBottom;

    if (
        info.direction === "down"
    ) {
        visibleTop =
            Math.max(
                bodyTop,
                0
            );

        visibleBottom =
            Math.min(
                bodyBottom,
                judgeY
            );
    } else {
        visibleTop =
            Math.max(
                bodyTop,
                judgeY
            );

        visibleBottom =
            Math.min(
                bodyBottom,
                canvas.height
            );
    }

    if (
        visibleTop > visibleBottom
    ) {
        return null;
    }

    return {
        top: visibleTop,
        bottom: visibleBottom
    };
}

function distanceToRange(
    value,
    minimum,
    maximum
) {
    if (value < minimum) {
        return minimum - value;
    }

    if (value > maximum) {
        return value - maximum;
    }

    return 0;
}

function removeNoteFromMouse(event) {
    if (
        state.currentScene
        !== SCENE.EDITOR
    ) {
        return;
    }

    const track =
        getTrack();

    if (!track || !track.paused) {
        return;
    }

    const mouse =
        getCanvasMousePosition(event);

    const targetNote =
        findNoteAtMousePosition(
            mouse.x,
            mouse.y
        );

    if (!targetNote) {
        return;
    }

    const removed =
        removeNote(targetNote);

    if (removed) {
        console.log(
            "ノーツを削除しました",
            targetNote
        );
        refreshPreviewEvents();
        markChartAsUnsaved();
        commitHistory();
    }
}

function selectNoteFromMouse(
    event
) {
    const mouse =
        getCanvasMousePosition(
            event
        );

    const targetNote =
        findNoteAtMousePosition(
            mouse.x,
            mouse.y
        );

    if (!targetNote) {
        if (
            !event.ctrlKey &&
            !event.shiftKey
        ) {
            clearSelection();
        }

        updateSelectionControls();

        return;
    }

    if (event.shiftKey) {
        selectNoteRange(
            targetNote
        );

        updateSelectionControls();

        return;
    }

    if (event.ctrlKey) {
        toggleNoteSelection(
            targetNote
        );

        updateSelectionControls();

        return;
    }

    selectSingleNote(
        targetNote
    );

    updateSelectionControls();
}

function selectSelectionMode() {
    state.placement.baseType =
        "select";

    state.placement.holdStart =
        null;

    updateNoteTypeControls();
}

function handleMouseDown(event) {
    if (
        state.currentScene
        !== SCENE.EDITOR
    ) {
        return;
    }

    if (event.button === 0) {
        if (
            state.placement.baseType
            === "select"
        ) {
            selectNoteFromMouse(event);
        } else {
            placeNoteFromMouse(event);
        }

        return;
    }

    if (
        event.button === 2 &&
        state.placement.baseType
            !== "select"
    ) {
        removeNoteFromMouse(event);
    }
}

function handleWheel(event) {
    event.preventDefault();

    focusCanvas();

    if (
        state.currentScene
        !== SCENE.EDITOR
    ) {
        return;
    }

    const direction =
        Math.sign(event.deltaY);

    if (direction === 0) {
        return;
    }

    if (event.ctrlKey) {
        changeNoteSpeed(
            -direction
            * NOTE_SPEED_STEP
        );

        return;
    }

    if (
        event.altKey ||
        editorAltKeyPressed
    ) {
        changeGridDivision(
            direction
        );
    
        focusCanvas();
    
        return;
    }

    const track =
        getTrack();

    if (
        !track ||
        !state.chart
    ) {
        return;
    }

    const currentTick =
        secondsToTick(
            track.currentTime
        );

    if (!Number.isFinite(currentTick)) {
        return;
    }

    const targetTick =
        getNextGridTick(
            currentTick,
            direction
        );

    if (!Number.isFinite(targetTick)) {
        return;
    }

    let targetTime =
        tickToSeconds(
            targetTick
        );

    if (!Number.isFinite(targetTime)) {
        return;
    }

    targetTime =
        Math.max(
            0,
            targetTime
        );

    if (
        Number.isFinite(
            track.duration
        )
    ) {
        targetTime =
            Math.min(
                targetTime,
                track.duration
            );
    }

    // console.log({
    //     direction,
    //     currentTime:
    //         track.currentTime,
    //     currentTick,
    //     gridTickSize:
    //         getGridTickSize(),
    
    //     nearestGridTick:
    //         Math.round(
    //             currentTick
    //             / getGridTickSize()
    //         ) * getGridTickSize(),
    
    //     distanceFromGrid:
    //         Math.abs(
    //             currentTick
    //             - Math.round(
    //                 currentTick
    //                 / getGridTickSize()
    //             ) * getGridTickSize()
    //         ),
    
    //     targetTick,
    //     targetTime,
    //     duration:
    //         track.duration
    // });

    track.currentTime =
        targetTime;

    resetPreviewPosition();

    updateTimingControls();
}

function isTextEditingElement(
    element
) {
    if (!element) {
        return false;
    }

    const tagName =
        element.tagName
            ?.toLowerCase();

    return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        element.isContentEditable
    );
}

export function initializeInput() {
    canvas.addEventListener(
        "pointerdown",
        () => {
            focusCanvas();
        }
    );

    canvas.addEventListener(
        "wheel",
        handleWheel,
        {
            passive: false
        }
    );

    canvas.addEventListener(
        "mousedown",
        handleMouseDown
    );

    canvas.addEventListener(
        "contextmenu",
        event => {
            event.preventDefault();
        }
    );

    document.addEventListener(
        "keydown",
        handleKeyDown
    );

    document.addEventListener(
        "keyup",
        handleKeyUp
    );

    focusCanvas();
}

function getNextGridTick(
    currentTick,
    direction
) {
    const gridTickSize =
        getGridTickSize();

    if (
        !Number.isFinite(currentTick) ||
        !Number.isFinite(gridTickSize) ||
        gridTickSize <= 0 ||
        direction === 0
    ) {
        return NaN;
    }

    const gridPosition =
        currentTick / gridTickSize;

    const nearestGridIndex =
        Math.round(gridPosition);

    const nearestGridTick =
        nearestGridIndex
        * gridTickSize;

    const distanceFromGrid =
        Math.abs(
            currentTick
            - nearestGridTick
        );

    const isOnGrid =
        distanceFromGrid
        <= GRID_SNAP_TOLERANCE_TICKS;

    let targetGridIndex;

    if (direction > 0) {
        if (isOnGrid) {
            targetGridIndex =
                nearestGridIndex + 1;
        } else {
            targetGridIndex =
                Math.ceil(gridPosition);
        }
    } else {
        if (isOnGrid) {
            targetGridIndex =
                nearestGridIndex - 1;
        } else {
            targetGridIndex =
                Math.floor(gridPosition);
        }
    }

    targetGridIndex =
        Math.max(
            0,
            targetGridIndex
        );

    return targetGridIndex
        * gridTickSize;
}

function focusCanvas() {
    if (
        document.activeElement
        !== canvas
    ) {
        canvas.focus({
            preventScroll: true
        });
    }
}

function wasAltRecentlyReleased() {
    return (
        performance.now()
        - lastAltReleaseTime
        <= ALT_FOCUS_GUARD_MS
    );
}