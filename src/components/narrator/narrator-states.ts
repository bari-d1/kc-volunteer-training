export const NARRATOR_STATES = [
  "idle",
  "wave",
  "point",
  "think",
  "celebrate",
  "encourage",
] as const;

export type NarratorState = (typeof NARRATOR_STATES)[number];

/** Values for the Rive state machine's Number input "state". */
export const NARRATOR_STATE_INDEX: Record<NarratorState, number> = {
  idle: 0,
  wave: 1,
  point: 2,
  think: 3,
  celebrate: 4,
  encourage: 5,
};

export const RIVE_SRC = "/narrator/kc_narrator.riv";
export const RIVE_WASM = "/narrator/rive.wasm";
export const RIVE_ARTBOARD = "Narrator";
export const RIVE_STATE_MACHINE = "NarratorMachine";
