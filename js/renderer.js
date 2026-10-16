import {
    LANE_IDS,
    LANE_INFO,
    LANE_COLUMN_COUNT,
    LANE_WIDTH,
    NOTE_WIDTH,
    NOTE_HEIGHT,
    HOLD_BODY_WIDTH
} from "./config.js";

import {
    canvas,
    ctx,
    state,
    getTrack,
    getJudgeY
} from "./state.js";

import {
    tickToSeconds,
    secondsToTick,
    getBpmEvents,
    getBpmAtTick
} from "./timing.js";

import {
    getGridTickSize,
    getGridDivision,
    getTimeSignatures,
    getTimeSignatureAtTick,
    isHoldNote,
    isCriticalNote,
    isNoteSelected
} from "./chart.js";

export function getLaneAreaLeft() {
    const totalWidth =
        LANE_COLUMN_COUNT * LANE_WIDTH;

    return (canvas.width - totalWidth) / 2;
}

export function getLaneX(lane) {
    const info = LANE_INFO[lane];

    if (!info) {
        return null;
    }

    const laneAreaLeft =
        getLaneAreaLeft();

    return laneAreaLeft
        + info.column * LANE_WIDTH
        + LANE_WIDTH / 2;
}

export function timeToY(time, currentTime, lane) {
    const timeDifference = time - currentTime;
    const direction = LANE_INFO[lane].direction;
    const judgeY = getJudgeY();

    if (direction === "down") {
        return judgeY
            - timeDifference * state.noteSpeed;
    }

    return judgeY
        + timeDifference * state.noteSpeed;
}

function getVisibleTickRange() {
    const track =
        getTrack();

    if (
        !track ||
        !state.chart
    ) {
        return null;
    }

    const currentTime =
        track.currentTime;

    const judgeY =
        getJudgeY();

    const upperDistance =
        judgeY;

    const lowerDistance =
        canvas.height - judgeY;

    const maximumDistance =
        Math.max(
            upperDistance,
            lowerDistance
        );

    const visibleSeconds =
        maximumDistance
        / state.noteSpeed;

    const startTime =
        Math.max(
            0,
            currentTime - visibleSeconds
        );

    const endTime =
        currentTime + visibleSeconds;

    const minimumTick =
        secondsToTick(startTime);

    const maximumTick =
        secondsToTick(endTime);

    if (
        !Number.isFinite(minimumTick) ||
        !Number.isFinite(maximumTick)
    ) {
        return null;
    }

    return {
        minimumTick,
        maximumTick,
        currentTime
    };
}

function clipLaneArea(lane) {
    const info = LANE_INFO[lane];
    const x = getLaneX(lane);
    const judgeY  = getJudgeY();

    if (!info || x === null) {
        return false;
    }

    ctx.beginPath();

    if (info.direction === "down") {
        // 上側レーンは判定線より上だけ表示
        ctx.rect(
            x - LANE_WIDTH / 2,
            0,
            LANE_WIDTH,
            judgeY
        );
    } else {
        // 下側レーンは判定線より下だけ表示
        ctx.rect(
            x - LANE_WIDTH / 2,
            judgeY,
            LANE_WIDTH,
            canvas.height - judgeY
        );
    }

    ctx.clip();

    return true;
}

function drawLanes() {
    for (const lane of LANE_IDS) {
        const info = LANE_INFO[lane];
        const x = getLaneX(lane);
        const judgeY=getJudgeY();

        if (!info || x === null) {
            continue;
        }

        if (info.direction === "down") {
            // 上側レーン
            ctx.fillStyle =
                info.column === 0
                    ? "#303846"
                    : "#384050";

            ctx.fillRect(
                x - LANE_WIDTH / 2,
                0,
                LANE_WIDTH,
                judgeY
            );
        } else {
            // 下側レーン
            ctx.fillStyle =
                info.column === 0
                    ? "#463830"
                    : "#504038";

            ctx.fillRect(
                x - LANE_WIDTH / 2,
                judgeY,
                LANE_WIDTH,
                canvas.height - judgeY
            );
        }
    }
}

function drawTimelineLine(
    tick,
    currentTime,
    style
) {
    const lineTime =
        tickToSeconds(tick);

    if (!Number.isFinite(lineTime)) {
        return;
    }

    const left =
        getLaneAreaLeft();

    const right =
        left
        + LANE_COLUMN_COUNT
        * LANE_WIDTH;

    const upperY =
        timeToY(
            lineTime,
            currentTime,
            0
        );

    const lowerY =
        timeToY(
            lineTime,
            currentTime,
            4
        );

    ctx.strokeStyle =
        style.color;

    ctx.lineWidth =
        style.width;

    if (
        Number.isFinite(upperY) &&
        upperY >= 0 &&
        upperY <= getJudgeY()
    ) {
        ctx.beginPath();
        ctx.moveTo(left, upperY);
        ctx.lineTo(right, upperY);
        ctx.stroke();
    }

    if (
        Number.isFinite(lowerY) &&
        lowerY >= getJudgeY() &&
        lowerY <= canvas.height
    ) {
        ctx.beginPath();
        ctx.moveTo(left, lowerY);
        ctx.lineTo(right, lowerY);
        ctx.stroke();
    }
}

function drawSubdivisionGridLines() {
    if (
        !state.chart ||
        !getTrack()
    ) {
        return;
    }

    const visibleRange =
        getVisibleTickRange();

    if (!visibleRange) {
        return;
    }

    const gridTickSize =
        getGridTickSize();

    if (
        !Number.isFinite(gridTickSize) ||
        gridTickSize <= 0
    ) {
        return;
    }

    const firstGridTick =
        Math.floor(
            visibleRange.minimumTick
            / gridTickSize
        ) * gridTickSize;

    const lastGridTick =
        visibleRange.maximumTick;

    const maximumLineCount = 2000;

    let lineCount = 0;

    for (
        let tick = firstGridTick;
        tick <= lastGridTick;
        tick += gridTickSize
    ) {
        if (tick < 0) {
            continue;
        }

        lineCount++;

        if (
            lineCount > maximumLineCount
        ) {
            console.warn(
                "グリッド線が多すぎるため描画を中止しました"
            );

            break;
        }

        const isBeat =
            isNearMultiple(
                tick,
                Number(state.chart.tpb)
            );

        if (isBeat) {
            drawTimelineLine(
                tick,
                visibleRange.currentTime,
                {
                    color:
                        "rgba(255, 255, 255, 0.45)",

                    width: 2
                }
            );
        } else {
            drawTimelineLine(
                tick,
                visibleRange.currentTime,
                {
                    color:
                        "rgba(255, 255, 255, 0.16)",

                    width: 1
                }
            );
        }
    }
}

function isNearMultiple(
    value,
    interval
) {
    if (
        !Number.isFinite(value) ||
        !Number.isFinite(interval) ||
        interval <= 0
    ) {
        return false;
    }

    const nearestMultiple =
        Math.round(
            value / interval
        ) * interval;

    return Math.abs(
        value - nearestMultiple
    ) < 0.001;
}

function getMeasureTickSize(
    numerator,
    denominator
) {
    const tpb =
        Number(state.chart.tpb);

    const numericNumerator =
        Number(numerator);

    const numericDenominator =
        Number(denominator);

    if (
        !Number.isFinite(tpb) ||
        tpb <= 0 ||

        !Number.isFinite(
            numericNumerator
        ) ||
        numericNumerator <= 0 ||

        !Number.isFinite(
            numericDenominator
        ) ||
        numericDenominator <= 0
    ) {
        return NaN;
    }

    return tpb
        * numericNumerator
        * (4 / numericDenominator);
}

function getVisibleMeasureLines(
    minimumTick,
    maximumTick
) {
    const signatures =
        getTimeSignatures();

    const measureLines = [];

    let nextMeasureNumber = 1;

    for (
        let index = 0;
        index < signatures.length;
        index++
    ) {
        const signature =
            signatures[index];

        const nextSignature =
            signatures[index + 1];

        const sectionStart =
            Number(signature.tick);

        const sectionEnd =
            nextSignature
                ? Number(nextSignature.tick)
                : maximumTick;

        if (
            !Number.isFinite(sectionStart) ||
            !Number.isFinite(sectionEnd)
        ) {
            continue;
        }

        const measureTickSize =
            getMeasureTickSize(
                signature.numerator,
                signature.denominator
            );

        if (
            !Number.isFinite(measureTickSize) ||
            measureTickSize <= 0
        ) {
            continue;
        }

        let measureTick =
            sectionStart;

        let safetyCount = 0;

        while (
            measureTick
            <= sectionEnd + 0.001
        ) {
            const isSectionEnd =
                nextSignature &&
                Math.abs(
                    measureTick
                    - sectionEnd
                ) < 0.001;

            if (!isSectionEnd) {
                if (
                    measureTick
                    >= minimumTick - 0.001 &&
                    measureTick
                    <= maximumTick + 0.001
                ) {
                    measureLines.push({
                        tick:
                            measureTick,

                        measureNumber:
                            nextMeasureNumber,

                        numerator:
                            signature.numerator,

                        denominator:
                            signature.denominator,

                        isSignatureChange:
                            Math.abs(
                                measureTick
                                - sectionStart
                            ) < 0.001
                    });
                }

                nextMeasureNumber++;
            }

            measureTick +=
                measureTickSize;

            safetyCount++;

            if (safetyCount > 100000) {
                console.warn(
                    "小節線の生成回数が上限を超えました"
                );

                break;
            }
        }

        if (
            sectionEnd > maximumTick &&
            !nextSignature
        ) {
            break;
        }
    }

    measureLines.sort(
        (first, second) => {
            return (
                first.tick
                - second.tick
            );
        }
    );

    return measureLines;
}

function drawMeasureNumber(
    line,
    currentTime
) {
    const lineTime =
        tickToSeconds(
            line.tick
        );

    if (!Number.isFinite(lineTime)) {
        return;
    }

    const upperY =
        timeToY(
            lineTime,
            currentTime,
            0
        );

    const lowerY =
        timeToY(
            lineTime,
            currentTime,
            4
        );

    const left =
        getLaneAreaLeft();

    ctx.save();

    ctx.fillStyle =
        "rgba(120, 205, 255, 1)";

    ctx.font =
        "bold 16px sans-serif";

    ctx.textAlign =
        "right";

    ctx.textBaseline =
        "middle";

    if (
        Number.isFinite(upperY) &&
        upperY >= 0 &&
        upperY <= getJudgeY()
    ) {
        ctx.fillText(
            String(
                line.measureNumber
            ),
            left - 10,
            upperY
        );
    }

    if (
        Number.isFinite(lowerY) &&
        lowerY >= getJudgeY() &&
        lowerY <= canvas.height
    ) {
        ctx.fillText(
            String(
                line.measureNumber
            ),
            left - 10,
            lowerY
        );
    }

    ctx.restore();
}

function drawTimeSignatureLabel(
    line,
    currentTime
) {
    if (!line.isSignatureChange) {
        return;
    }

    const lineTime =
        tickToSeconds(
            line.tick
        );

    if (!Number.isFinite(lineTime)) {
        return;
    }

    const upperY =
        timeToY(
            lineTime,
            currentTime,
            0
        );

    const right =
        getLaneAreaLeft()
        + LANE_COLUMN_COUNT
        * LANE_WIDTH;

    if (
        !Number.isFinite(upperY) ||
        upperY < 0 ||
        upperY > getJudgeY()
    ) {
        return;
    }

    ctx.save();

    ctx.fillStyle =
        "rgba(120, 205, 255, 1)";

    ctx.font =
        "bold 14px sans-serif";

    ctx.textAlign =
        "left";

    ctx.textBaseline =
        "middle";

    ctx.fillText(
        `${line.numerator}/${line.denominator}`,
        right + 10,
        upperY
    );

    ctx.restore();
}

function drawMeasureLines() {
    if (
        !state.chart ||
        !getTrack()
    ) {
        return;
    }

    const visibleRange =
        getVisibleTickRange();

    if (!visibleRange) {
        return;
    }

    const measureLines =
        getVisibleMeasureLines(
            visibleRange.minimumTick,
            visibleRange.maximumTick
        );

    for (const line of measureLines) {
        drawTimelineLine(
            line.tick,
            visibleRange.currentTime,
            {
                color:
                    "rgba(100, 190, 255, 0.95)",

                width: 4
            }
        );

        drawMeasureNumber(
            line,
            visibleRange.currentTime
        );

        drawTimeSignatureLabel(
            line,
            visibleRange.currentTime
        );
    }
}

function drawBpmEvents() {
    const track =
        getTrack();
    
    if(!track || !state.chart) return;

    const currentTime =
        track.currentTime;

    const left =
        getLaneAreaLeft();

    const right =
        left
        + LANE_COLUMN_COUNT
        * LANE_WIDTH;

    const judgeY=getJudgeY();

    const bpmEvents =
        getBpmEvents();

    for (const event of bpmEvents) {
        const eventTime =
            tickToSeconds(
                event.tick
            );

        for (
            const referenceLane of [0, 4]
        ) {
            const y =
                timeToY(
                    eventTime,
                    currentTime,
                    referenceLane
                );

            if (
                referenceLane === 0 &&
                (y < 0 || y > judgeY)
            ) {
                continue;
            }

            if (
                referenceLane === 4 &&
                (
                    y < judgeY ||
                    y > canvas.height
                )
            ) {
                continue;
            }

            ctx.strokeStyle =
                "rgba(255, 90, 90, 0.95)";

            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();

            if (referenceLane === 0) {
                ctx.fillStyle =
                    "rgb(255, 120, 120)";

                ctx.font =
                    "16px sans-serif";

                ctx.textAlign =
                    "left";

                ctx.fillText(
                    `BPM ${event.bpm}`,
                    right + 8,
                    y + 5
                );
            }
        }
    }
}

function drawTapNote(
    note,
    x,
    y
) {
    if (
        y < -NOTE_HEIGHT ||
        y > canvas.height
            + NOTE_HEIGHT
    ) {
        return;
    }

    ctx.save();

    if (!clipLaneArea(note.lane)) {
        ctx.restore();
        return;
    }

    if (isCriticalNote(note)) {
        ctx.fillStyle = "gold";
    } else {
        ctx.fillStyle = "cyan";
    }

    ctx.fillRect(
        x - NOTE_WIDTH / 2,
        y - NOTE_HEIGHT / 2,
        NOTE_WIDTH,
        NOTE_HEIGHT
    );

    ctx.restore();
}

function drawHoldNote(
    note,
    x,
    startY,
    currentTime
) {
    const endY =
        timeToY(
            note.endTime,
            currentTime,
            note.lane
        );

    if (
        !Number.isFinite(endY)
    ) {
        return;
    }

    if (
        startY < -100 &&
        endY < -100
    ) {
        return;
    }

    if (
        startY > canvas.height + 100 &&
        endY > canvas.height + 100
    ) {
        return;
    }

    ctx.save();

    if (!clipLaneArea(note.lane)) {
        ctx.restore();
        return;
    }

    const bodyTop =
        Math.min(startY, endY);

    const bodyBottom =
        Math.max(startY, endY);

    const bodyHeight =
        bodyBottom - bodyTop;

    if (isCriticalNote(note)) {
        ctx.fillStyle =
            "rgba(255, 190, 40, 0.65)";
    } else {
        ctx.fillStyle =
            "rgba(50, 255, 120, 0.65)";
    }

    ctx.fillRect(
        x - HOLD_BODY_WIDTH / 2,
        bodyTop,
        HOLD_BODY_WIDTH,
        bodyHeight
    );

    if (isCriticalNote(note)) {
        ctx.fillStyle = "gold";
    } else {
        ctx.fillStyle = "lime";
    }

    ctx.fillRect(
        x - NOTE_WIDTH / 2,
        startY - NOTE_HEIGHT / 2,
        NOTE_WIDTH,
        NOTE_HEIGHT
    );

    if (isCriticalNote(note)) {
        ctx.fillStyle = "#fff0a0";
    } else {
        ctx.fillStyle = "#b0ffb0";
    }

    ctx.fillRect(
        x - NOTE_WIDTH / 2,
        endY - NOTE_HEIGHT / 2,
        NOTE_WIDTH,
        NOTE_HEIGHT
    );

    ctx.restore();
}

function drawPendingHoldStart() {
    const pending =
        state.placement?.holdStart;

    if (!pending) {
        return;
    }

    const track =
        getTrack();

    if (!track) {
        return;
    }

    const x =
        getLaneX(
            pending.lane
        );

    const time =
        tickToSeconds(
            pending.tick
        );

    const y =
        timeToY(
            time,
            track.currentTime,
            pending.lane
        );

    if (
        x === null ||
        !Number.isFinite(y)
    ) {
        return;
    }

    ctx.save();

    if (!clipLaneArea(pending.lane)) {
        ctx.restore();
        return;
    }

    ctx.fillStyle =
        "rgba(255, 255, 255, 0.35)";

    ctx.strokeStyle =
        "white";

    ctx.lineWidth = 2;

    ctx.fillRect(
        x - NOTE_WIDTH / 2,
        y - NOTE_HEIGHT / 2,
        NOTE_WIDTH,
        NOTE_HEIGHT
    );

    ctx.strokeRect(
        x - NOTE_WIDTH / 2,
        y - NOTE_HEIGHT / 2,
        NOTE_WIDTH,
        NOTE_HEIGHT
    );

    ctx.restore();
}

function drawSelectionOutline(
    note,
    x,
    startY,
    currentTime
) {
    if (!isNoteSelected(note)) {
        return;
    }

    ctx.save();

    if (!clipLaneArea(note.lane)) {
        ctx.restore();
        return;
    }

    ctx.strokeStyle =
        "#ff4dff";

    ctx.lineWidth = 3;

    if (isHoldNote(note)) {
        const endY =
            timeToY(
                note.endTime,
                currentTime,
                note.lane
            );

        const top =
            Math.min(
                startY,
                endY
            );

        const bottom =
            Math.max(
                startY,
                endY
            );

        ctx.strokeRect(
            x - NOTE_WIDTH / 2 - 3,
            top - NOTE_HEIGHT / 2 - 3,
            NOTE_WIDTH + 6,
            bottom
                - top
                + NOTE_HEIGHT
                + 6
        );
    } else {
        ctx.strokeRect(
            x - NOTE_WIDTH / 2 - 3,
            startY
                - NOTE_HEIGHT / 2
                - 3,
            NOTE_WIDTH + 6,
            NOTE_HEIGHT + 6
        );
    }

    ctx.restore();
}

function drawNotes() {
    const track =
        getTrack();

    if(!track || !state.chart) return;

    const currentTime =
        track.currentTime;

    for (const note of state.chart.notes) {
        if (note.type === "_bpm") {
            continue;
        }

        const info =
            LANE_INFO[note.lane];

        if (!info) {
            continue;
        }

        const x =
            getLaneX(note.lane);

        if (x === null) {
            continue;
        }

        const startY =
            timeToY(
                note.time,
                currentTime,
                note.lane
            );

        if (!Number.isFinite(startY)) {
            continue;
        }

        if (isHoldNote(note)) {
            drawHoldNote(
                note,
                x,
                startY,
                currentTime
            );
        } else {
            drawTapNote(
                note,
                x,
                startY
            );
        }
        
        drawSelectionOutline(
            note,
            x,
            startY,
            currentTime
        );
    }
}

function drawJudgeLine() {
    const left = getLaneAreaLeft();

    const right =
        left
        + LANE_COLUMN_COUNT
        * LANE_WIDTH;

    const judgeY=
        getJudgeY();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(left, judgeY);
    ctx.lineTo(right, judgeY);
    ctx.stroke();
}

function drawEditorInfo() {
    const track =
        getTrack();

    if(!track || !state.chart) return;

    const currentTick =
        secondsToTick(
            track.currentTime
        );

    const currentBpm =
        getBpmAtTick(
            currentTick
        );

    const currentSignature =
        getTimeSignatureAtTick(
            currentTick
        );

    const playableNoteCount =
        state.chart.notes.filter(
            note => {
                return note.type !== "_bpm";
            }
        ).length;

    let status = "PAUSED";

    if (!track.paused) {
        status = "PLAYING";
    }

    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.font = "20px sans-serif";

    ctx.fillText(
        `Time: ${track.currentTime.toFixed(3)} s`,
        20,
        30
    );

    ctx.fillText(
        `Status: ${status}`,
        20,
        60
    );

    ctx.fillText(
        `Speed: ${state.noteSpeed}`,
        20,
        90
    );

    ctx.fillText(
        `Grid: 1/${getGridDivision()}`,
        20,
        120
    );

    ctx.fillText(
        `Notes: ${playableNoteCount}`,
        20,
        150
    );

    ctx.fillText(
        `BPM: ${currentBpm}`,
        20,
        180
    );
    
    ctx.fillText(
        `Time Signature: ${currentSignature.numerator}/${currentSignature.denominator}`,
        20,
        210
    );
    
    ctx.fillText(
        `Tick: ${currentTick.toFixed(3)}`,
        20,
        240
    );

    ctx.fillText(
        `Preview offset: ${
            state.audioPreview
                .offsetMilliseconds
        } ms`,
        20,
        270
    );


    ctx.fillText(
        `QWER: Change note type`,
        20,
        310
    );

    ctx.fillText(
        `F: flip horizontal / G: flip vertical`,
        20,
        340
    )

    ctx.fillText(
        `Alt+Wheel: Glid`,
        20,
        370
    );

    ctx.fillText(
        `Ctrl+Wheel: Speed`,
        20,
        400
    );

    ctx.fillText(
        `Ctrl+S: Save`,
        20,
        430
    )

    ctx.fillText(
        `Esc: Cancel to place Hold`,
        20,
        460
    )

    ctx.fillText(
        `Ctrl+Z: Undo`,
        20,
        490
    )

    ctx.fillText(
        `Ctrl+Y / Ctrl+Shift+Z: Redo`,
        20,
        520
    )
}

export function drawLoading(){

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "40px sans-serif";

    ctx.fillText(
        "Loading...",
        canvas.width / 2 - 100,
        canvas.height / 2
    );
}

export function drawEditor() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "#111";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawLanes();
    drawSubdivisionGridLines();
    drawMeasureLines();
    drawBpmEvents();
    drawNotes();
    drawPendingHoldStart();
    drawJudgeLine();
    drawEditorInfo();
}