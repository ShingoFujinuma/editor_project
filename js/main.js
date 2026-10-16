import {
    SCENE
} from "./config.js";

import {
    state
} from "./state.js";

import {
    loadAssets,
    loadChart
} from "./loader.js";

import {
    prepareChartData
} from "./chart.js";

import {
    drawLoading,
    drawEditor
} from "./renderer.js";

import {
    initializeToolbar
} from "./ui.js";

import {
    initializeInput
} from "./input.js";

import {
    initializeAudioPreview,
    startAudioPreviewScheduler
} from "./audio-preview.js";

import{
    initializeHistory
}from "./history.js"

import {
    loadEditorSettings
} from "./settings.js";

function updateEditor() {
    // 今後の選択処理などを追加する
}

function updateScene() {
    switch (state.currentScene) {
        case SCENE.EDITOR:
            updateEditor();
            break;
    }
}

function drawScene() {
    switch (state.currentScene) {
        case SCENE.LOADING:
            drawLoading();
            break;

        case SCENE.EDITOR:
            drawEditor();
            break;
    }
}

function editorLoop() {
    updateScene();
    drawScene();

    requestAnimationFrame(
        editorLoop
    );
}

async function startEditor() {
    state.currentScene =
        SCENE.LOADING;

    drawLoading();

    try {
        await loadAssets();
        await loadChart();

        prepareChartData();

        loadEditorSettings();

        initializeHistory();

        await initializeAudioPreview();

        initializeToolbar();
        initializeInput();

        startAudioPreviewScheduler();

        state.currentScene =
            SCENE.EDITOR;

        editorLoop();
    } catch (error) {
        console.error(
            "エディターの起動に失敗しました",
            error
        );
    }
}

startEditor();