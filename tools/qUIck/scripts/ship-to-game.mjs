import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetProject = process.argv[2];
const targetSubdir = process.argv[3] ?? "tools/qUIck";

if (!targetProject) {
  console.error('Usage: npm run ship -- "C:\\Path\\To\\Game Project" [tools/qUIck]');
  process.exit(1);
}

const targetRoot = path.resolve(targetProject);
const destination = path.resolve(targetRoot, targetSubdir);
const rootWithSeparator = `${rootDir}${path.sep}`;
const destinationWithSeparator = `${destination}${path.sep}`;

if (destination === rootDir || destinationWithSeparator.startsWith(rootWithSeparator)) {
  console.error("Refusing to ship qUIck into itself. Choose a different game project path.");
  process.exit(1);
}

const ignoredDirs = new Set([
  ".git",
  ".vite",
  "build",
  "dist",
  "node_modules"
]);

function shouldCopy(source) {
  const relativePath = path.relative(rootDir, source);
  if (!relativePath) {
    return true;
  }

  const parts = relativePath.split(path.sep);
  if (parts.some((part) => ignoredDirs.has(part))) {
    return false;
  }

  const fileName = path.basename(source);
  return !fileName.endsWith(".log") && !fileName.endsWith(".tsbuildinfo");
}

await mkdir(destination, { recursive: true });
await cp(rootDir, destination, {
  recursive: true,
  force: true,
  errorOnExist: false,
  filter: shouldCopy
});

console.log(`qUIck toolkit shipped to ${destination}`);
console.log("Next: wire @figma-pixi/* through workspaces, file dependencies, or Vite aliases in that game.");
