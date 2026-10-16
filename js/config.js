export const SCENE = {
    LOADING: "loading",
    EDITOR: "editor"
};

export const LANE_IDS = [
    0,
    2,
    4,
    6
];

export const LANE_INFO = {
    0: {
        column: 0,
        direction: "down"
    },

    2: {
        column: 1,
        direction: "down"
    },

    4: {
        column: 0,
        direction: "up"
    },

    6: {
        column: 1,
        direction: "up"
    }
};

export const LANE_COLUMN_COUNT = 2;
export const LANE_WIDTH = 80;

export const NOTE_WIDTH = 60;
export const NOTE_HEIGHT = 12;
export const HOLD_BODY_WIDTH = 36;

export const MIN_NOTE_SPEED = 100;
export const MAX_NOTE_SPEED = 1000;
export const NOTE_SPEED_STEP = 50;

export const MIN_GRID_DIVISION = 1;
export const MAX_GRID_DIVISION = 192;

export const TICK_TOLERANCE = 0.001;

export const GRID_SNAP_TOLERANCE_TICKS = 0.01;