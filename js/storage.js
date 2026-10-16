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

function createChartJsonText() {
    const exportChart =
        createChartForExport();

    const validationErrors =
        validateChartForExport(
            exportChart
        );

    if (
        validationErrors.length > 0
    ) {
        throw new Error(
            validationErrors.join("\n")
        );
    }

    return {
        exportChart,

        jsonText:
            JSON.stringify(
                exportChart,
                null,
                2
            )
    };
}

async function writeJsonToFileHandle(
    fileHandle,
    jsonText
) {
    if (!fileHandle) {
        throw new Error(
            "上書き保存先が設定されていません"
        );
    }

    const permissionGranted =
        await ensureWritePermission(
            fileHandle
        );

    if (!permissionGranted) {
        throw new Error(
            "ファイルへの書込みが許可されませんでした"
        );
    }

    const writable =
        await fileHandle.createWritable();

    try {
        await writable.write(
            jsonText
        );

        await writable.close();
    } catch (error) {
        try {
            await writable.abort();
        } catch {
            // 元のエラーを優先
        }

        throw error;
    }
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
            id:
                "rhythm-chart-save",

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

    await writeJsonToFileHandle(
        fileHandle,
        jsonText
    );

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
    const {
        exportChart,
        jsonText
    } = createChartJsonText();

    if (
        "showSaveFilePicker"
        in window
    ) {
        const fileHandle =
            await saveWithFilePicker(
                jsonText
            );

        state.fileSession
            .chartFileHandle =
            fileHandle;

        state.fileSession
            .chartFileName =
            fileHandle.name;

        return {
            method:
                "file-picker",

            chart:
                exportChart,

            fileHandle
        };
    }

    saveWithDownload(
        jsonText
    );

    return {
        method:
            "download",

        chart:
            exportChart,

        fileHandle:
            null
    };
}

export function hasWritableChartFile() {
    return Boolean(
        state.fileSession
            .chartFileHandle
    );
}

export async function overwriteChartJson() {
    const fileHandle =
        state.fileSession
            .chartFileHandle;

    if (!fileHandle) {
        return await saveChartAsJson();
    }

    const {
        exportChart,
        jsonText
    } = createChartJsonText();

    await writeJsonToFileHandle(
        fileHandle,
        jsonText
    );

    return {
        method:
            "overwrite",

        chart:
            exportChart,

        fileHandle
    };
}

async function ensureWritePermission(
    fileHandle
) {
    if (
        !fileHandle ||
        typeof fileHandle.queryPermission
            !== "function"
    ) {
        return true;
    }

    const options = {
        mode: "readwrite"
    };

    const currentPermission =
        await fileHandle.queryPermission(
            options
        );

    if (
        currentPermission === "granted"
    ) {
        return true;
    }

    const requestedPermission =
        await fileHandle.requestPermission(
            options
        );

    return (
        requestedPermission
        === "granted"
    );
}