/**
 * Guards a mistake tests can't otherwise catch: server code importing a
 * plain value (function, constant) from a "use client" module. Next.js
 * only passes components across that boundary; anything else arrives as a
 * placeholder and breaks at runtime (it caused a dashboard crash and
 * silently disabled narrator hints).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "generated" ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)
      ? [path]
      : [];
  });
}

const isClient = (path: string) =>
  /^\s*["']use client["']/.test(readFileSync(path, "utf8"));

function resolve(spec: string, from: string) {
  const base = spec.startsWith("@/")
    ? join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? normalize(join(dirname(from), spec))
      : null;
  if (!base) return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

describe("server/client boundary", () => {
  it("server modules only import components (PascalCase) from client modules", () => {
    const all = files(SRC);
    const client = new Set(all.filter(isClient));
    const problems: string[] = [];

    for (const file of all.filter((f) => !client.has(f))) {
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(
        /import\s+(?!type\b)\{([^}]*)\}\s+from\s+["']([^"']+)["']/g,
      )) {
        const target = resolve(m[2], file);
        if (!target || !client.has(target)) continue;
        for (const raw of m[1].split(",")) {
          const name = raw
            .trim()
            .split(/\s+as\s+/)[0]
            .trim();
          if (!name || name.startsWith("type ")) continue;
          const isComponent = /^[A-Z][a-z]/.test(name);
          if (!isComponent)
            problems.push(`${file.replace(SRC, "src")}: ${name}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
