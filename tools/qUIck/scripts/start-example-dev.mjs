import { openSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleDir = path.join(rootDir, "example-pixi-project");
const viteEntry = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const port = process.env.PORT ?? "5181";
const out = openSync(path.join(rootDir, "quick-vite.out.log"), "w");
const err = openSync(path.join(rootDir, "quick-vite.err.log"), "w");

const child = spawn(
  process.execPath,
  [viteEntry, "--host", "127.0.0.1", "--port", port, "--clearScreen", "false"],
  {
    cwd: exampleDir,
    detached: true,
    stdio: ["ignore", out, err],
    windowsHide: true
  }
);

child.unref();

console.log(`Started qUIck example dev server pid ${child.pid}`);
console.log(`URL: http://127.0.0.1:${port}/`);
