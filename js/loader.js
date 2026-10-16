import {
    assets,
    state
} from "./state.js";

async function loadAssetConfig() {
    const response =
        await fetch("assets.json");

    if (!response.ok) {
        throw new Error(
            `assets.jsonの読み込みに失敗しました: ${response.status}`
        );
    }

    return await response.json();
}

function loadImage(key, path) {
    return new Promise(
        (resolve, reject) => {
            const image =
                new Image();

            image.addEventListener(
                "load",
                () => resolve(image),
                {
                    once: true
                }
            );

            image.addEventListener(
                "error",
                () => {
                    reject(
                        new Error(
                            `画像を読み込めません: ${path}`
                        )
                    );
                },
                {
                    once: true
                }
            );

            assets.images[key] =
                image;

            image.src =
                path;
        }
    );
}

function loadSound(key, path) {
    return new Promise(
        (resolve, reject) => {
            const sound =
                new Audio();

            sound.addEventListener(
                "loadeddata",
                () => resolve(sound),
                {
                    once: true
                }
            );

            sound.addEventListener(
                "error",
                () => {
                    reject(
                        new Error(
                            `音声を読み込めません: ${path}`
                        )
                    );
                },
                {
                    once: true
                }
            );

            assets.sounds[key] =
                sound;

            sound.preload =
                "auto";

            sound.src =
                path;

            sound.load();
        }
    );
}

export async function loadAssets() {
    const config =
        await loadAssetConfig();

    const promises = [];

    for (
        const [key, path]
        of Object.entries(
            config.images ?? {}
        )
    ) {
        promises.push(
            loadImage(key, path)
        );
    }

    for (
        const [key, path]
        of Object.entries(
            config.sounds ?? {}
        )
    ) {
        promises.push(
            loadSound(key, path)
        );
    }

    await Promise.all(promises);
}

export function createEmptyChart(
    initialBpm = 120
) {
    return {
        version: 1,
        title: "Untitled",
        bpm: initialBpm,
        tpb: 480,
        offset: 0,
        notes: []
    };
}

// export async function loadChart() {
//     const path =
//         "input/chart.json";

//     const response =
//         await fetch(path);

//     if (response.status === 404) {
//         console.warn(
//             "chart.jsonが見つからないため、"
//             + "空の譜面を作成します"
//         );

//         state.chart =
//             createEmptyChart();

//         return;
//     }

//     if (!response.ok) {
//         throw new Error(
//             `譜面を読み込めません: `
//             + `${response.status} `
//             + `${response.statusText}`
//         );
//     }

//     let loadedChart;

//     try {
//         loadedChart =
//             await response.json();
//     } catch (error) {
//         throw new Error(
//             "chart.jsonのJSON形式が壊れています",
//             {
//                 cause: error
//             }
//         );
//     }

//     if (
//         !loadedChart ||
//         !Array.isArray(
//             loadedChart.notes
//         )
//     ) {
//         throw new Error(
//             "chart.jsonのnotesが配列ではありません"
//         );
//     }

//     state.chart =
//         loadedChart;
// }