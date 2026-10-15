/**
 * Every admin page, server action and route handler must call
 * requireAdmin() itself. The proxy also guards /admin, but server actions
 * can be called directly, so this can't rely on it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Only the login action may run before signing in. */
const PUBLIC_ACTIONS = new Set(["adminLogin"]);

function files(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  } catch {
    return [];
  }
}

const adminFiles = [
  ...files(join(ROOT, "src/app/admin")),
  ...files(join(ROOT, "src/app/api/admin")),
].filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

const pages = adminFiles.filter(
  (f) => f.endsWith("page.tsx") && !f.includes("/login/"),
);
const actionFiles = adminFiles.filter((f) =>
  /^\s*["']use server["']/.test(readFileSync(f, "utf8")),
);
const routes = adminFiles.filter((f) => /route\.tsx?$/.test(f));

/** Each exported async function and the first statement in its body. */
function exportedFunctions(source: string) {
  return [
    ...source.matchAll(
      /export async function (\w+)\s*\([^)]*\)[^{]*\{\s*([^\n;]*)/g,
    ),
  ].map(([, name, firstLine]) => ({ name, firstLine }));
}

describe("admin guards", () => {
  it("finds the admin pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(7);
  });

  it.each(pages.map((f) => relative(ROOT, f)))(
    "%s calls requireAdmin()",
    (file) => {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source).toMatch(/await requireAdmin\(\)/);
    },
  );

  it.each([...actionFiles, ...routes].map((f) => relative(ROOT, f)))(
    "every export in %s calls requireAdmin() first",
    (file) => {
      const functions = exportedFunctions(
        readFileSync(join(ROOT, file), "utf8"),
      );
      expect(functions.length).toBeGreaterThan(0);
      for (const { name, firstLine } of functions) {
        if (PUBLIC_ACTIONS.has(name)) continue;
        expect(firstLine, `${name} in ${file}`).toMatch(
          /^await requireAdmin\(\)/,
        );
      }
    },
  );
});
