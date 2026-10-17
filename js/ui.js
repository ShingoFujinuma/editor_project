import {
    MIN_NOTE_SPEED,
    MAX_NOTE_SPEED,
    NOTE_SPEED_STEP,
    MIN_GRID_DIVISION,
    MAX_GRID_DIVISION,
    TICK_TOLERANCE
} from "./config.js";

import {
    secondsToTick,
    getBpmAtTick
} from "./timing.js";

import {
    snapTickToGrid,
    setBpmAtTick,
    removeBpmAtTick,
    setTimeSignatureAtTick,
    removeTimeSignatureAtTick,
    getTimeSignatureAtTick,
    copySelectedNotes,
    cutSelectedNotes,
    pasteClipboardNotes,
    deleteSelectedNotes,
    flipSelectedNotesHorizontally,
    flipSelectedNotesVertically,
    toggleSelectedNotesCritical
} from "./chart.js";

import {
    state,
    getTrack
} from "./state.js";

import {
    overwriteChartJson,
    saveChartAsJson
} from "./storage.js";

import {
    markPreviewEventsDirty,
    resetPreviewPosition,
    notifyPreviewOffsetChanged,
    refreshPreviewEvents
} from "./audio-preview.js";

import {
    undo,
    redo,
    setHistoryChangeCallback,
    commitHistory
} from "./history.js";

import {
    saveEditorSettings,
    clearEditorSettings
} from "./settings.js";

import {
    hasLoadedTrack,
    openNextFile,
    replaceTrackFile
} from "./file-open.js";

import {
    showError,
    showSuccess,
    showWarning
} from "./notifications.js";

const gridDownButton =
    document.getElementById(
        "grid-down-button"
    );

const gridUpButton =
    document.getElementById(
        "grid-up-button"
    );

const gridDisplay =
    document.getElementById(
        "grid-display"
    );

const speedDownButton =
    document.getElementById(
        "speed-down-button"
    );

const speedUpButton =
    document.getElementById(
        "speed-up-button"
    );

const speedDisplay =
    document.getElementById(
        "speed-display"
    );

const initialBpmInput =
    document.getElementById(
        "initial-bpm-input"
    );

const timeSignatureNumeratorInput =
    document.getElementById(
        "time-signature-numerator"
    );

const timeSignatureDenominatorSelect =
    document.getElementById(
        "time-signature-denominator"
    );

const applyInitialSettingsButton =
    document.getElementById(
        "apply-initial-settings-button"
    );

const signatureEventNumeratorInput =
    document.getElementById(
        "signature-event-numerator"
    );

const signatureEventDenominatorSelect =
    document.getElementById(
        "signature-event-denominator"
    );

const setSignatureEventButton =
    document.getElementById(
        "set-signature-event-button"
    );

const removeSignatureEventButton =
    document.getElementById(
        "remove-signature-event-button"
    );

const bpmEventInput =
    document.getElementById(
        "bpm-event-input"
    );

const setBpmEventButton =
    document.getElementById(
        "set-bpm-event-button"
    );

const removeBpmEventButton =
    document.getElementById(
        "remove-bpm-event-button"
    );

const noteTypeTapRadio =
    document.getElementById(
        "note-type-tap"
    );

const noteTypeHoldRadio =
    document.getElementById(
        "note-type-hold"
    );

const noteCriticalCheckbox =
    document.getElementById(
        "note-critical-checkbox"
    );

const selectedNoteTypeDisplay =
    document.getElementById(
        "selected-note-type-display"
    );

const saveChartButton =
    document.getElementById(
        "save-chart-button"
    );

const saveStatus =
    document.getElementById(
        "save-status"
    );

const sidePanel =
    document.getElementById(
        "side-panel"
    );

const togglePanelButton =
    document.getElementById(
        "toggle-panel-button"
    );

const openPanelButton =
    document.getElementById(
        "open-panel-button"
    );

const metronomeEnabledCheckbox =
    document.getElementById(
        "metronome-enabled-checkbox"
    );

const answerEnabledCheckbox =
    document.getElementById(
        "answer-enabled-checkbox"
    );

const metronomeVolumeSlider =
    document.getElementById(
        "metronome-volume-slider"
    );

const answerVolumeSlider =
    document.getElementById(
        "answer-volume-slider"
    );

const previewOffsetInput =
    document.getElementById(
        "preview-offset-input"
    );

const previewOffsetMinusButton =
    document.getElementById(
        "preview-offset-minus-button"
    );

const previewOffsetResetButton =
    document.getElementById(
        "preview-offset-reset-button"
    );

const previewOffsetPlusButton =
    document.getElementById(
        "preview-offset-plus-button"
    );

const metronomeVolumeDisplay =
    document.getElementById(
        "metronome-volume-display"
    );

const answerVolumeDisplay =
    document.getElementById(
        "answer-volume-display"
    );

const undoButton =
    document.getElementById(
        "undo-button"
    );

const redoButton =
    document.getElementById(
        "redo-button"
    );

const historyStatus =
    document.getElementById(
        "history-status"
    );

const resetEditorSettingsButton =
    document.getElementById(
        "reset-editor-settings-button"
    );

const noteTypeSelectRadio =
    document.getElementById(
        "note-type-select"
    );

const copyNotesButton =
    document.getElementById(
        "copy-notes-button"
    );

const cutNotesButton =
    document.getElementById(
        "cut-notes-button"
    );

const pasteNotesButton =
    document.getElementById(
        "paste-notes-button"
    );

const flipHorizontalButton =
    document.getElementById(
        "flip-horizontal-button"
    );

const flipVerticalButton =
    document.getElementById(
        "flip-vertical-button"
    );

const deleteSelectedNotesButton =
    document.getElementById(
        "delete-selected-notes-button"
    );

const selectionStatus =
    document.getElementById(
        "selection-status"
    );

const toggleSelectedCriticalButton =
    document.getElementById(
        "toggle-selected-critical-button"
    );

const openFileButton =
    document.getElementById(
        "open-file-button"
    );

const replaceTrackButton =
    document.getElementById(
        "replace-track-button"
    );

const loadedFileStatus =
    document.getElementById(
        "loaded-file-status"
    );

const overwriteChartButton =
    document.getElementById(
        "overwrite-chart-button"
    );

const trackVolumeSlider =
    document.getElementById(
        "track-volume-slider"
    );

const trackVolumeDisplay =
    document.getElementById(
        "track-volume-display"
    );

const playbackRateSlider =
    document.getElementById(
        "playback-rate-slider"
    );

const playbackRateDisplay =
    document.getElementById(
        "playback-rate-display"
    );

const playbackRateDownButton =
    document.getElementById(
        "playback-rate-down-button"
    );

const playbackRateResetButton =
    document.getElementById(
        "playback-rate-reset-button"
    );

const playbackRateUpButton =
    document.getElementById(
        "playback-rate-up-button"
    );

const MIN_PREVIEW_OFFSET_MS = -1000;
const MAX_PREVIEW_OFFSET_MS = 1000;
const PREVIEW_OFFSET_STEP_MS = 10;

const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 2;
const PLAYBACK_RATE_STEP = 0.05;

export function updateGridControls() {
    gridDisplay.textContent =
        `${state.gridDivision}分音符`;

    gridDownButton.disabled =
        state.gridDivision
        <= MIN_GRID_DIVISION;

    gridUpButton.disabled =
        state.gridDivision
        >= MAX_GRID_DIVISION;
}

export function changeGridDivision(
    amount
) {
    const nextDivision =
        state.gridDivision + amount;

    if (
        nextDivision < MIN_GRID_DIVISION ||
        nextDivision > MAX_GRID_DIVISION
    ) {
        return;
    }

    state.gridDivision =
        nextDivision;

    updateGridControls();

    saveEditorSettings();
}

export function updateSpeedControls() {
    speedDisplay.textContent =
        `${state.noteSpeed} px/s`;

    speedDownButton.disabled =
        state.noteSpeed
        <= MIN_NOTE_SPEED;

    speedUpButton.disabled =
        state.noteSpeed
        >= MAX_NOTE_SPEED;
}

export function changeNoteSpeed(
    amount
) {
    const nextSpeed =
        state.noteSpeed + amount;

    state.noteSpeed =
        Math.max(
            MIN_NOTE_SPEED,
            Math.min(
                nextSpeed,
                MAX_NOTE_SPEED
            )
        );

    updateSpeedControls();

    saveEditorSettings();
}

function getPlacementTypeLabel() {
    const baseType =
        state.placement.baseType;

    const critical =
        state.placement.critical;

    if (baseType === "select") {
        return "ノーツ選択";
    }

    if (baseType === "hold") {
        return critical
            ? "クリティカルホールド"
            : "通常ホールド";
    }

    return critical
        ? "クリティカルタップ"
        : "通常タップ";
}

export function updateNoteTypeControls() {
    noteTypeTapRadio.checked =
        state.placement.baseType === "tap";

    noteTypeHoldRadio.checked =
        state.placement.baseType === "hold";

    noteTypeSelectRadio.checked =
        state.placement.baseType === "select";

    noteCriticalCheckbox.checked =
        state.placement.critical;

    selectedNoteTypeDisplay.textContent =
        getPlacementTypeLabel();

    const isSelectionMode =
        state.placement.baseType === "select";

    noteCriticalCheckbox.disabled =
        isSelectionMode;

    if (isSelectionMode) {
        selectedNoteTypeDisplay.style.color =
            "#9ed8ff";

        selectedNoteTypeDisplay.style.borderColor =
            "#9ed8ff";
    } else if (
        state.placement.critical
    ) {
        selectedNoteTypeDisplay.style.color =
            "#ffe66d";

        selectedNoteTypeDisplay.style.borderColor =
            "#ffe66d";
    } else {
        selectedNoteTypeDisplay.style.color =
            "white";

        selectedNoteTypeDisplay.style.borderColor =
            "#777";
    }
}

function cancelPendingHold() {
    state.placement.holdStart =
        null;
}

function getCurrentEditorTick() {
    const track =
        getTrack();

    if (!track) {
        return 0;
    }

    const rawTick =
        secondsToTick(
            track.currentTime
        );

    if (!Number.isFinite(rawTick)) {
        return 0;
    }

    return snapTickToGrid(
        rawTick
    );
}

function applyInitialSettings() {
    if (!state.chart) {
        return;
    }

    const bpm =
        Number(
            initialBpmInput.value
        );

    const numerator =
        Number(
            timeSignatureNumeratorInput.value
        );

    const denominator =
        Number(
            timeSignatureDenominatorSelect.value
        );

    if (
        !Number.isFinite(bpm) ||
        bpm <= 0
    ) {
        alert(
            "初期BPMは0より大きい数値にしてください"
        );

        return;
    }

    const bpmApplied =
        setBpmAtTick(
            0,
            bpm
        );

    const signatureApplied =
        setTimeSignatureAtTick(
            0,
            numerator,
            denominator
        );

    if (
        bpmApplied &&
        signatureApplied
    ) {
        refreshPreviewEvents();
        updateTimingControls();
        markChartAsUnsaved();
        commitHistory();

        console.log(
            "初期設定を反映しました",
            {
                bpm,
                numerator,
                denominator
            }
        );
    }
}

function placeBpmEvent() {
    const tick =
        getCurrentEditorTick();

    const bpm =
        Number(
            bpmEventInput.value
        );

    if (
        !Number.isFinite(bpm) ||
        bpm <= 0
    ) {
        alert(
            "BPMは0より大きい数値にしてください"
        );

        return;
    }

    const applied =
        setBpmAtTick(
            tick,
            bpm
        );

    if (applied) {
        updateTimingControls();

        console.log(
            "BPM変更を配置しました",
            {
                tick,
                bpm
            }
        );
        refreshPreviewEvents();
        markChartAsUnsaved();
        commitHistory();
    }
}

function placeTimeSignatureEvent() {
    const tick =
        getCurrentEditorTick();

    const numerator =
        Number(
            signatureEventNumeratorInput
                .value
        );

    const denominator =
        Number(
            signatureEventDenominatorSelect
                .value
        );

    const applied =
        setTimeSignatureAtTick(
            tick,
            numerator,
            denominator
        );

    if (applied) {
        updateTimingControls();

        console.log(
            "拍子変更を配置しました",
            {
                tick,
                numerator,
                denominator
            }
        );
        refreshPreviewEvents();
        markChartAsUnsaved();
        commitHistory();
    } else {
        alert(
            "拍子の設定値が不正です"
        );
    }
}

export function updateTimingControls() {
    if (!state.chart) {
        return;
    }

    const tick =
        getCurrentEditorTick();

    const currentBpm =
        getBpmAtTick(tick);

    const currentSignature =
        getTimeSignatureAtTick(
            tick
        );

    initialBpmInput.value =
        Number(state.chart.bpm);

    timeSignatureNumeratorInput.value =
        getTimeSignatureAtTick(0)
            .numerator;

    timeSignatureDenominatorSelect.value =
        String(
            getTimeSignatureAtTick(0)
                .denominator
        );

    bpmEventInput.value =
        Number(currentBpm);

    signatureEventNumeratorInput.value =
        currentSignature.numerator;

    signatureEventDenominatorSelect.value =
        String(
            currentSignature.denominator
        );
}

function updateSaveStatus(
    message,
    statusClass = ""
) {
    saveStatus.textContent =
        message;

    saveStatus.classList.remove(
        "saved",
        "error"
    );

    if (statusClass !== "") {
        saveStatus.classList.add(
            statusClass
        );
    }
}

export async function handleSaveChart() {
    updateSaveStatus(
        "保存中..."
    );

    saveChartButton.disabled =
        true;

    try {
        const result =
            await overwriteChartJson();

        updateSaveStatus(
            "保存しました",
            "saved"
        );

        updateLoadedFileControls();

        if (
            result.method
            === "overwrite"
        ) {
            showSuccess(
                "譜面ファイルを上書き保存しました"
            );
        } else {
            showSuccess(
                "譜面ファイルを保存しました"
            );
        }

        console.log(
            "譜面を保存しました",
            result
        );

        return true;
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "AbortError"
        ) {
            updateSaveStatus(
                "保存をキャンセル"
            );

            return false;
        }

        updateSaveStatus(
            "保存エラー",
            "error"
        );

        showError(
            error,
            "譜面を保存できませんでした"
        );

        return false;
    } finally {
        saveChartButton.disabled =
            false;
    }
}

export async function handleSaveChartAs() {
    updateSaveStatus(
        "保存中..."
    );

    saveChartButton.disabled =
        true;

    try {
        await saveChartAsJson();

        updateSaveStatus(
            "保存しました",
            "saved"
        );

        updateLoadedFileControls();

        showSuccess(
            "譜面ファイルを保存しました"
        );

        return true;
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "AbortError"
        ) {
            updateSaveStatus(
                "保存をキャンセル"
            );

            return false;
        }

        updateSaveStatus(
            "保存エラー",
            "error"
        );

        showError(
            error,
            "譜面を保存できませんでした"
        );

        return false;
    } finally {
        saveChartButton.disabled =
            false;
    }
}

export function markChartAsUnsaved() {
    updateSaveStatus(
        "未保存"
    );
}

function closeSidePanel() {
    sidePanel.hidden = true;
    openPanelButton.hidden = false;
}

function openSidePanel() {
    sidePanel.hidden = false;
    openPanelButton.hidden = true;
}

function setPreviewOffsetMilliseconds(
    value
) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return;
    }

    const clampedValue =
        Math.max(
            MIN_PREVIEW_OFFSET_MS,
            Math.min(
                numericValue,
                MAX_PREVIEW_OFFSET_MS
            )
        );

    state.audioPreview
        .offsetMilliseconds =
        clampedValue;

    previewOffsetInput.value =
        String(clampedValue);

    notifyPreviewOffsetChanged();

    saveEditorSettings();
}

function changePreviewOffsetMilliseconds(
    amount
) {
    const currentValue =
        Number(
            state.audioPreview
                .offsetMilliseconds
        );

    setPreviewOffsetMilliseconds(
        currentValue + amount
    );
}

export function handleUndo() {
    const restored =
        undo();

    if (!restored) {
        return;
    }

    refreshPreviewEvents();
    updateTimingControls();
    updateNoteTypeControls();
    updateSelectionControls();
    markChartAsUnsaved();
}

export function handleRedo() {
    const restored =
        redo();

    if (!restored) {
        return;
    }

    refreshPreviewEvents();
    updateTimingControls();
    updateNoteTypeControls();
    updateSelectionControls();
    markChartAsUnsaved();
}

function updateHistoryControls(
    historyState
) {
    undoButton.disabled =
        !historyState.canUndo;

    redoButton.disabled =
        !historyState.canRedo;

    historyStatus.textContent =
        `元に戻せる操作: ${historyState.undoCount}`
        + ` / やり直せる操作: ${historyState.redoCount}`;
}

export function updateSelectionControls() {
    const selectedCount =
        state.selection.notes.length;

    const clipboardCount =
        state.selection.clipboard.length;

    const hasSelection =
        selectedCount > 0;

    const hasClipboard =
        clipboardCount > 0;

    selectionStatus.textContent =
        `選択中: ${selectedCount}`
        + ` / コピー: ${clipboardCount}`;

    copyNotesButton.disabled =
        !hasSelection;

    cutNotesButton.disabled =
        !hasSelection;

    deleteSelectedNotesButton.disabled =
        !hasSelection;

    flipHorizontalButton.disabled =
        !hasSelection;

    flipVerticalButton.disabled =
        !hasSelection;

    toggleSelectedCriticalButton.disabled =
        !hasSelection;

    pasteNotesButton.disabled =
        !hasClipboard;
}

export function handleCopySelectedNotes() {
    const copied =
        copySelectedNotes();

    if (copied) {
        updateSelectionControls();
    }

    return copied;
}

export function handleCutSelectedNotes() {
    const cut =
        cutSelectedNotes();

    if (!cut) {
        return false;
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
    updateSelectionControls();

    return true;
}

export function handlePasteSelectedNotes() {
    const baseTick =
        getCurrentEditorTick();

    const result =
        pasteClipboardNotes(
            baseTick
        );

    if (result.pastedCount === 0) {
        showWarning(
            "貼り付け先に既存ノーツやホールドがあるため、ノーツを貼り付けられませんでした。",
            "貼り付け失敗"
        );

        return false;
    }

    if (result.skippedCount > 0) {
        showWarning(
            `${result.pastedCount}個を貼り付け、`
            + `${result.skippedCount}個を重複のため省略しました。`,
            "一部のノーツを省略しました"
        );
    } else {
        showSuccess(
            `${result.pastedCount}個のノーツを貼り付けました。`
        );
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
    updateSelectionControls();

    return true;
}

export function handleDeleteSelectedNotes() {
    const deleted =
        deleteSelectedNotes();

    if (!deleted) {
        return false;
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
    updateSelectionControls();

    return true;
}

export function handleFlipHorizontal() {
    const flipped =
        flipSelectedNotesHorizontally();

    if (!flipped) {
        showWarning(
            "反転先に既存ノーツまたはホールドがあるため、左右反転できません。",
            "左右反転できません"
        );

        return false;
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
    updateSelectionControls();

    return true;
}

export function handleFlipVertical() {
    const flipped =
        flipSelectedNotesVertically();

    if (!flipped) {
        showWarning(
            "反転先に既存ノーツまたはホールドがあるため、上下反転できません。",
            "上下反転できません"
        );

        return false;
    }

    refreshPreviewEvents();
    markChartAsUnsaved();
    commitHistory();
    updateSelectionControls();

    return true;
}

export function handleToggleSelectedCritical() {
    const changed =
        toggleSelectedNotesCritical();

    if (!changed) {
        return false;
    }

    refreshPreviewEvents();

    markChartAsUnsaved();

    commitHistory();

    updateSelectionControls();

    return true;
}

export function updateLoadedFileControls() {
    const trackLoaded =
        hasLoadedTrack();

    if (trackLoaded) {
        openFileButton.textContent =
            "譜面を開く";
    } else {
        openFileButton.textContent =
            "音源を開く";
    }

    replaceTrackButton.disabled =
        !trackLoaded;

    const trackName =
        state.fileSession
            .trackFileName
        ?? "未読込";

    const chartName =
        state.fileSession
            .chartFileName
        ?? "新規譜面";

    loadedFileStatus.innerHTML =
        `音源: ${escapeHtml(trackName)}`
        + "<br>"
        + `譜面: ${escapeHtml(chartName)}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

export async function handleOpenFile() {
    openFileButton.disabled =
        true;

    try {
        const openingTrack =
            !hasLoadedTrack();

        const opened =
            await openNextFile();

        if (!opened) {
            return false;
        }

        updateLoadedFileControls();
        updateTimingControls();
        updateSelectionControls();

        if (openingTrack) {
            showSuccess(
                "音源ファイルを読み込みました"
            );
        } else {
            showSuccess(
                "譜面ファイルを読み込みました"
            );
        }

        return true;
    } catch (error) {
        showError(
            error,
            "ファイルを読み込めませんでした"
        );

        return false;
    } finally {
        openFileButton.disabled =
            false;
    }
}

async function handleReplaceTrack() {
    replaceTrackButton.disabled =
        true;

    try {
        const opened =
            await replaceTrackFile();

        if (!opened) {
            return;
        }

        updateLoadedFileControls();
        updateTimingControls();
        updateSelectionControls();

        markChartAsUnsaved();
    } catch (error) {
        console.error(
            "音源を変更できませんでした",
            error
        );

        alert(
            "音源を変更できませんでした"
            + "\n\n"
            + error.message
        );
    } finally {
        replaceTrackButton.disabled =
            !hasLoadedTrack();
    }
}

function clampTrackVolume(value) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return 1;
    }

    return Math.max(
        0,
        Math.min(
            numericValue,
            1
        )
    );
}

export function applyTrackVolume() {
    const volume =
        clampTrackVolume(
            state.playback.trackVolume
        );

    state.playback.trackVolume =
        volume;

    const track =
        getTrack();

    if (track) {
        track.volume =
            volume;
    }
}

function updateTrackVolumeControl() {
    const volume =
        clampTrackVolume(
            state.playback.trackVolume
        );

    trackVolumeSlider.value =
        String(volume);

    trackVolumeDisplay.textContent =
        volume.toFixed(2);

    applyTrackVolume();
}

function clampPlaybackRate(value) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return 1;
    }

    return Math.max(
        MIN_PLAYBACK_RATE,
        Math.min(
            numericValue,
            MAX_PLAYBACK_RATE
        )
    );
}

function roundPlaybackRate(value) {
    return Number(
        Number(value).toFixed(2)
    );
}

export function applyPlaybackRate() {
    const playbackRate =
        roundPlaybackRate(
            clampPlaybackRate(
                state.playback
                    .playbackRate
            )
        );

    state.playback.playbackRate =
        playbackRate;

    const track =
        getTrack();

    if (!track) {
        return;
    }

    track.playbackRate =
        playbackRate;

    /*
     * 速度を変更しても、
     * 元の音程を可能な範囲で維持する。
     */
    track.preservesPitch =
        true;
}

function updatePlaybackRateControl() {
    const playbackRate =
        roundPlaybackRate(
            clampPlaybackRate(
                state.playback
                    .playbackRate
            )
        );

    playbackRateSlider.value =
        String(playbackRate);

    playbackRateDisplay.textContent =
        `${playbackRate.toFixed(2)}x`;

    playbackRateResetButton.textContent =
        `${playbackRate.toFixed(2)}x`;

    playbackRateDownButton.disabled =
        playbackRate
        <= MIN_PLAYBACK_RATE;

    playbackRateUpButton.disabled =
        playbackRate
        >= MAX_PLAYBACK_RATE;

    applyPlaybackRate();
}

export function setPlaybackRate(
    value
) {
    const playbackRate =
        roundPlaybackRate(
            clampPlaybackRate(value)
        );

    state.playback.playbackRate =
        playbackRate;

    updatePlaybackRateControl();

    saveEditorSettings();

    /*
     * 予約済みのプレビュー音を
     * 新しい倍率に合わせ直す。
     */
    refreshPreviewEvents();
}

export function changePlaybackRate(
    amount
) {
    setPlaybackRate(
        state.playback.playbackRate
        + amount
    );
}

function initializePlaybackRateControl() {
    updatePlaybackRateControl();

    playbackRateSlider.addEventListener(
        "input",
        () => {
            setPlaybackRate(
                playbackRateSlider.value
            );
        }
    );

    playbackRateDownButton
        .addEventListener(
            "click",
            () => {
                changePlaybackRate(
                    -PLAYBACK_RATE_STEP
                );
            }
        );

    playbackRateResetButton
        .addEventListener(
            "click",
            () => {
                setPlaybackRate(1);
            }
        );

    playbackRateUpButton
        .addEventListener(
            "click",
            () => {
                changePlaybackRate(
                    PLAYBACK_RATE_STEP
                );
            }
        );
}

function initializeTrackVolumeControl() {
    updateTrackVolumeControl();

    trackVolumeSlider.addEventListener(
        "input",
        () => {
            const volume =
                clampTrackVolume(
                    trackVolumeSlider.value
                );

            state.playback.trackVolume =
                volume;

            trackVolumeDisplay.textContent =
                volume.toFixed(2);

            applyTrackVolume();

            saveEditorSettings();
        }
    );
}

export function initializeToolbar() {
    gridDownButton.addEventListener(
        "click",
        () => {
            changeGridDivision(-1);
        }
    );

    gridUpButton.addEventListener(
        "click",
        () => {
            changeGridDivision(1);
        }
    );

    speedDownButton.addEventListener(
        "click",
        () => {
            changeNoteSpeed(
                -NOTE_SPEED_STEP
            );
        }
    );

    speedUpButton.addEventListener(
        "click",
        () => {
            changeNoteSpeed(
                NOTE_SPEED_STEP
            );
        }
    );

    applyInitialSettingsButton
    .addEventListener(
        "click",
        applyInitialSettings
    );
    
    setBpmEventButton.addEventListener(
        "click",
        placeBpmEvent
    );
    
    removeBpmEventButton.addEventListener(
        "click",
        () => {
            const tick =
                getCurrentEditorTick();
    
            if (
                Math.abs(tick) < TICK_TOLERANCE
            ) {
                alert(
                    "初期BPMは削除できません"
                );
    
                return;
            }
    
            const removed =
                removeBpmAtTick(tick);
    
            if (!removed) {
                console.log(
                    "現在位置にBPM変更はありません"
                );
    
                return;
            }
    
            refreshPreviewEvents();
            updateTimingControls();
            markChartAsUnsaved();
            commitHistory();
    
            console.log(
                "BPM変更を削除しました",
                {
                    tick
                }
            );
        }
    );
    
    setSignatureEventButton.addEventListener(
        "click",
        placeTimeSignatureEvent
    );
    
    removeSignatureEventButton.addEventListener(
        "click",
        () => {
            const tick =
                getCurrentEditorTick();
    
            if (
                Math.abs(tick) < TICK_TOLERANCE
            ) {
                alert(
                    "初期拍子は削除できません"
                );
    
                return;
            }
    
            const removed =
                removeTimeSignatureAtTick(
                    tick
                );
    
            if (!removed) {
                console.log(
                    "現在位置に拍子変更はありません"
                );
    
                return;
            }
    
            refreshPreviewEvents();
            updateTimingControls();
            markChartAsUnsaved();
            commitHistory();
    
            console.log(
                "拍子変更を削除しました",
                {
                    tick
                }
            );
        }
    );

    overwriteChartButton.addEventListener(
        "click",
        handleSaveChart
    );
    
    saveChartButton.addEventListener(
        "click",
        handleSaveChartAs
    );

    togglePanelButton.addEventListener(
        "click",
        closeSidePanel
    );
    
    openPanelButton.addEventListener(
        "click",
        openSidePanel
    );

    undoButton.addEventListener(
        "click",
        handleUndo
    );
    
    redoButton.addEventListener(
        "click",
        handleRedo
    );

    resetEditorSettingsButton
    .addEventListener(
        "click",
        () => {
            const shouldReset =
                window.confirm(
                    "保存されたエディター設定を"
                    + "初期値に戻しますか？"
                );

            if (!shouldReset) {
                return;
            }

            const cleared =
                clearEditorSettings();

            if (cleared) {
                window.location.reload();
            }
        }
    );

    toggleSelectedCriticalButton
    .addEventListener(
        "click",
        handleToggleSelectedCritical
    );

    openFileButton.addEventListener(
        "click",
        handleOpenFile
    );
    
    replaceTrackButton.addEventListener(
        "click",
        handleReplaceTrack
    );
    
    updateLoadedFileControls();
    
    setHistoryChangeCallback(
        updateHistoryControls
    );

    initializeNoteTypeControls();
    initializeAudioPreviewControls();
    initializeTrackVolumeControl();
    initializePlaybackRateControl();

    updateGridControls();
    updateSpeedControls();

    updateSelectionControls();
    updateTimingControls();
    updateTrackVolumeControl();
}

function initializeNoteTypeControls() {
    noteTypeTapRadio.addEventListener(
        "change",
        () => {
            if (!noteTypeTapRadio.checked) {
                return;
            }

            state.placement.baseType =
                "tap";

            cancelPendingHold();
            updateNoteTypeControls();
        }
    );

    noteTypeHoldRadio.addEventListener(
        "change",
        () => {
            if (!noteTypeHoldRadio.checked) {
                return;
            }

            state.placement.baseType =
                "hold";

            cancelPendingHold();
            updateNoteTypeControls();
        }
    );

    noteCriticalCheckbox.addEventListener(
        "change",
        () => {
            state.placement.critical =
                noteCriticalCheckbox.checked;

            cancelPendingHold();
            updateNoteTypeControls();
        }
    );

    noteTypeSelectRadio.addEventListener(
        "change",
        () => {
            if (!noteTypeSelectRadio.checked) {
                return;
            }
    
            state.placement.baseType =
                "select";
    
            state.placement.holdStart =
                null;
    
            updateNoteTypeControls();
        }
    );

    updateNoteTypeControls();
}

function initializeAudioPreviewControls() {
    metronomeEnabledCheckbox.checked =
        state.audioPreview
            .metronomeEnabled;

    answerEnabledCheckbox.checked =
        state.audioPreview
            .answerEnabled;

    metronomeVolumeSlider.value =
        String(
            state.audioPreview
                .metronomeVolume
        );

    answerVolumeSlider.value =
        String(
            state.audioPreview
                .answerVolume
        );

    metronomeEnabledCheckbox
        .addEventListener(
            "change",
            () => {
                state.audioPreview
                    .metronomeEnabled =
                    metronomeEnabledCheckbox
                        .checked;
    
                notifyPreviewOffsetChanged();
    
                saveEditorSettings();
            }
        );

    answerEnabledCheckbox
        .addEventListener(
            "change",
            () => {
                state.audioPreview
                    .answerEnabled =
                    answerEnabledCheckbox
                        .checked;

                notifyPreviewOffsetChanged();
                saveEditorSettings();
            }
        );

    previewOffsetInput.value =
        String(
            state.audioPreview
                .offsetMilliseconds
        );

    previewOffsetInput.addEventListener(
        "change",
        () => {
            setPreviewOffsetMilliseconds(
                previewOffsetInput.value
            );
        }
    );

    previewOffsetMinusButton
        .addEventListener(
            "click",
            () => {
                changePreviewOffsetMilliseconds(
                    -PREVIEW_OFFSET_STEP_MS
                );
            }
        );

    previewOffsetResetButton
        .addEventListener(
            "click",
            () => {
                setPreviewOffsetMilliseconds(
                    0
                );
            }
        );

    previewOffsetPlusButton
        .addEventListener(
            "click",
            () => {
                changePreviewOffsetMilliseconds(
                    PREVIEW_OFFSET_STEP_MS
                );
            }
        );

    metronomeVolumeDisplay.textContent =
        state.audioPreview
            .metronomeVolume
            .toFixed(2);
    
    answerVolumeDisplay.textContent =
        state.audioPreview
            .answerVolume
            .toFixed(2);

    metronomeVolumeSlider.addEventListener(
        "input",
        () => {
            const volume =
                Number(
                    metronomeVolumeSlider.value
                );
    
            state.audioPreview
                .metronomeVolume =
                volume;
    
            metronomeVolumeDisplay.textContent =
                volume.toFixed(2);

            saveEditorSettings();
        }
    );
    
    answerVolumeSlider.addEventListener(
        "input",
        () => {
            const volume =
                Number(
                    answerVolumeSlider.value
                );
    
            state.audioPreview
                .answerVolume =
                volume;
    
            answerVolumeDisplay.textContent =
                volume.toFixed(2);

            saveEditorSettings();
        }
    );

    copyNotesButton.addEventListener(
        "click",
        handleCopySelectedNotes
    );
    
    cutNotesButton.addEventListener(
        "click",
        handleCutSelectedNotes
    );
    
    pasteNotesButton.addEventListener(
        "click",
        handlePasteSelectedNotes
    );
    
    deleteSelectedNotesButton
        .addEventListener(
            "click",
            handleDeleteSelectedNotes
        );
    
    flipHorizontalButton.addEventListener(
        "click",
        handleFlipHorizontal
    );
    
    flipVerticalButton.addEventListener(
        "click",
        handleFlipVertical
    );
}