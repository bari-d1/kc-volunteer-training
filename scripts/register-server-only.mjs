/**
 * Lets scripts import src/server modules. Their `import "server-only"`
 * throws outside Next's server build, so it resolves to an empty file.
 * Usage: tsx --import ./scripts/register-server-only.mjs <script>
 */
import { registerHooks } from "node:module";

const stub = new URL("./server-only-stub.cjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: stub, format: "commonjs", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
