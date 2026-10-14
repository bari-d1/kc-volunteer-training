/**
 * Copies the Rive WebAssembly runtime into public/ so the narrator loads it
 * from our own domain instead of a CDN. Runs on postinstall; the copy is
 * gitignored so it always matches the installed runtime version.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const reactCanvas = dirname(
  require.resolve("@rive-app/react-canvas/package.json"),
);
const canvas = dirname(
  createRequire(join(reactCanvas, "package.json")).resolve(
    "@rive-app/canvas/package.json",
  ),
);

mkdirSync("public/narrator", { recursive: true });
copyFileSync(join(canvas, "rive.wasm"), "public/narrator/rive.wasm");
console.log("Copied rive.wasm to public/narrator/");
