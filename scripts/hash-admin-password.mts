/**
 * Prints an ADMIN_PASSWORD_HASH line for .env.
 *
 * Usage: pnpm admin:hash-password            (prompts, input hidden)
 *        pnpm admin:hash-password "password"  (ends up in shell history)
 *
 * The argon2id hash is base64url-encoded because raw hashes contain "$",
 * which Next.js would treat as variable references in .env files.
 */
import { createInterface } from "node:readline";
import { hash } from "@node-rs/argon2";

async function promptHidden(question: string) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })
    ._writeToOutput;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (
    s,
  ) => {
    // Echo the prompt, hide what's typed.
    if (s.startsWith(question)) write.call(rl, s);
  };
  const answer = await new Promise<string>((resolve) =>
    rl.question(question, resolve),
  );
  rl.close();
  process.stdout.write("\n");
  return answer;
}

const password = process.argv[2] ?? (await promptHidden("Admin password: "));

if (password.length < 12) {
  console.error("Use at least 12 characters. A few random words works well.");
  process.exit(1);
}

const encoded = Buffer.from(await hash(password)).toString("base64url");
console.log(`\nADMIN_PASSWORD_HASH="${encoded}"`);
