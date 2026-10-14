"use client";

import {
  Layout,
  Fit,
  Alignment,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";
import { useEffect } from "react";
import {
  NARRATOR_STATE_INDEX,
  RIVE_ARTBOARD,
  RIVE_SRC,
  RIVE_STATE_MACHINE,
  RIVE_WASM,
  type NarratorState,
} from "./narrator-states";

let wasmConfigured = false;

/** Load the runtime from our own domain, not the default CDN. Runs once. */
function useOwnWasm() {
  if (wasmConfigured) return;
  RuntimeLoader.setWasmUrl(RIVE_WASM);
  wasmConfigured = true;
}

/** The animated Rive narrator. Loaded on demand (see narrator.tsx). */
export default function NarratorRive({
  state,
  talking,
  size,
  onError,
  onLoad,
}: {
  state: NarratorState;
  talking: boolean;
  size: number;
  onError: () => void;
  onLoad: () => void;
}) {
  useOwnWasm();
  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    artboard: RIVE_ARTBOARD,
    stateMachines: RIVE_STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad,
    onLoadError: onError,
  });
  // Set the state machine inputs straight on the Rive instance.
  useEffect(() => {
    const inputs = rive?.stateMachineInputs(RIVE_STATE_MACHINE) ?? [];
    for (const input of inputs) {
      if (input.name === "state") input.value = NARRATOR_STATE_INDEX[state];
      if (input.name === "talking") input.value = talking;
    }
  }, [rive, state, talking]);

  return (
    <RiveComponent
      aria-hidden="true"
      data-narrator-rive=""
      style={{ width: size, height: size }}
    />
  );
}
