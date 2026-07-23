import { build } from "esbuild";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const shouldCopy = process.argv.includes("--copy");

/** This copies text to the clipboard. I need this to speed up development. */
function copyToClipboard(text) {
  const [command, args] =
    process.platform === "darwin"
      ? ["pbcopy", []]
      : process.platform === "win32"
        ? ["clip", []]
        : ["xclip", ["-selection", "clipboard"]];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with code ${code}`)),
    );
    child.stdin.end(text);
  });
}

const outfile = "dist/ynab-currency-converter.user.js";

const pkg = JSON.parse(await readFile("package.json", "utf8"));

const result = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  write: false,
}).catch(() => process.exit(1));

const code = result.outputFiles[0].text;
const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);

const banner = `// ==UserScript==
// @name         YNAB Currency Converter
// @version      ${pkg.version} (${hash})
// @description  Allows YNAB to work with multiple currencies seamlessly.
// @author       Heavenira (Ezra Oppenheimer)
// @match        https://app.ynab.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ynab.com
// @grant        GM_xmlhttpRequest
// @run-at       document-body
// ==/UserScript==`;

const output = `${banner}\n${code}`;

await mkdir(dirname(outfile), { recursive: true });
await writeFile(outfile, output);

if (shouldCopy) {
  await copyToClipboard(output);
}
