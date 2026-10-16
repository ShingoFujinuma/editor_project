import {
    state
} from "./state.js";

import {
    isHoldNote
} from "./chart.js";

function roundChartNumber(value) {
    const numericValue =
        Number(value);

    if (!Number.isFinite(numericValue)) {
        return null;
    }

    return Number(
        numericValue.toFixed(6)
    );
}

function createExportNote(note) {
    if (note.type === "_bpm") {
        return {
            type: "_bpm",

            tick:
                roundChartNumber(
                    note.tick
                ),

            bpm:
                roundChartNumber(
                    note.bpm
                )
        };
    }

    const outputNote = {
        lane:
            Number(note.lane),

        tick:
            roundChartNumber(
                note.tick
            ),

        type:
            note.type
    };

    if (isHoldNote(note)) {
        outputNote.duration =
            roundChartNumber(
                note.duration
            );
    }

    return outputNote;
}

function compareExportNotes(
    first,
    second
) {
    const tickDifference =
        Number(first.tick)
        - Number(second.tick);

    if (Math.abs(tickDifference) >= 0.000001) {
        return tickDifference;
    }

    const firstIsBpm =
        first.type === "_bpm";

    const secondIsBpm =
        second.type === "_bpm";

    if (firstIsBpm && !secondIsBpm) {
        return -1;
    }

    if (!firstIsBpm && secondIsBpm) {
        return 1;
    }

    const firstLane =
        Number(first.lane ?? -1);

    const secondLane =
        Number(second.lane ?? -1);

    return firstLane - secondLane;
}

export function createChartForExport() {
    if (!state.chart) {
        throw new Error(
            "出力する譜面がありません"
        );
    }

    const notes =
        state.chart.notes
            .map(createExportNote)
            .sort(compareExportNotes);

    return {
        version:
            Number(
                state.chart.version ?? 1
            ),

        title:
            String(
                state.chart.title
                ?? "Untitled"
            ),

        bpm:
            roundChartNumber(
                state.chart.bpm
            ),

        tpb:
            Number(
                state.chart.tpb
            ),

        offset:
            roundChartNumber(
                state.chart.offset ?? 0
            ),

        notes:
            notes
    };
}

export function validateChartForExport(
    chart
) {
    const errors = [];

    if (
        !Number.isFinite(chart.version)
    ) {
        errors.push(
            "versionが不正です"
        );
    }

    if (
        typeof chart.title !== "string" ||
        chart.title.trim() === ""
    ) {
        errors.push(
            "titleが空です"
        );
    }

    if (
        !Number.isFinite(chart.bpm) ||
        chart.bpm <= 0
    ) {
        errors.push(
            "初期BPMが不正です"
        );
    }

    if (
        !Number.isFinite(chart.tpb) ||
        chart.tpb <= 0
    ) {
        errors.push(
            "tpbが不正です"
        );
    }

    if (!Array.isArray(chart.notes)) {
        errors.push(
            "notesが配列ではありません"
        );

        return errors;
    }

    chart.notes.forEach(
        (note, index) => {
            const location =
                `notes[${index}]`;

            if (
                !Number.isFinite(note.tick) ||
                note.tick < 0
            ) {
                errors.push(
                    `${location}のtickが不正です`
                );
            }

            if (note.type === "_bpm") {
                if (
                    !Number.isFinite(note.bpm) ||
                    note.bpm <= 0
                ) {
                    errors.push(
                        `${location}のBPMが不正です`
                    );
                }

                return;
            }

            const allowedTypes = [
                "normal",
                "critical",
                "long",
                "critical_long"
            ];

            if (
                !allowedTypes.includes(
                    note.type
                )
            ) {
                errors.push(
                    `${location}のtypeが不正です: ${note.type}`
                );
            }

            // const allowedLanes = [
            //     0,
            //     2,
            //     4,
            //     6
            // ];
            const allowedLanes = [
                0,
                1,
                2,
                3,
                4,
                5,
                6
            ];

            if (
                !allowedLanes.includes(
                    note.lane
                )
            ) {
                errors.push(
                    `${location}のlaneが不正です: ${note.lane}`
                );
            }

            const isHold =
                note.type === "long" ||
                note.type ===
                    "critical_long";

            if (
                isHold &&
                (
                    !Number.isFinite(
                        note.duration
                    ) ||
                    note.duration <= 0
                )
            ) {
                errors.push(
                    `${location}のdurationが不正です`
                );
            }
        }
    );

    return errors;
}

function createSuggestedFileName() {
    const title =
        String(
            state.chart?.title
            ?? "chart"
        );

    const safeTitle =
        title
            .trim()
            .replace(
                /[\\/:*?"<>|]/g,
                "_"
            );

    if (safeTitle === "") {
        return "chart.json";
    }

    return `${safeTitle}.json`;
}

async function saveWithFilePicker(
    jsonText
) {
    const fileHandle =
        await window.showSaveFilePicker({
            id: "rhythm-chart-json",

            suggestedName:
                createSuggestedFileName(),

            types: [
                {
                    description:
                        "譜面JSONファイル",

                    accept: {
                        "application/json": [
                            ".json"
                        ]
                    }
                }
            ]
        });

    const writable =
        await fileHandle
            .createWritable();

    await writable.write(
        jsonText
    );

    await writable.close();

    return fileHandle;
}

function saveWithDownload(
    jsonText
) {
    const blob =
        new Blob(
            [jsonText],
            {
                type:
                    "application/json;charset=utf-8"
            }
        );

    const objectUrl =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement("a");

    link.href =
        objectUrl;

    link.download =
        createSuggestedFileName();

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    setTimeout(
        () => {
            URL.revokeObjectURL(
                objectUrl
            );
        },
        1000
    );
}

export async function saveChartAsJson() {
    const exportChart =
        createChartForExport();

    const validationErrors =
        validateChartForExport(
            exportChart
        );

    if (
        validationErrors.length > 0
    ) {
        console.error(
            "譜面を保存できません",
            validationErrors
        );

        throw new Error(
            validationErrors.join("\n")
        );
    }

    const jsonText =
        JSON.stringify(
            exportChart,
            null,
            2
        );

    if (
        "showSaveFilePicker"
        in window
    ) {
        await saveWithFilePicker(
            jsonText
        );

        return {
            method: "file-picker",
            chart: exportChart
        };
    }

    saveWithDownload(
        jsonText
    );

    return {
        method: "download",
        chart: exportChart
    };
}